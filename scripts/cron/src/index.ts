import { loadConfig } from './config.js';
import { createLogger, type Logger } from './log.js';
import { fetchAll, SOURCES } from './sources/index.js';
import type { SourceFetcher } from './sources/rss.js';
import { normalize } from './pipeline/normalize.js';
import { dedupeInBatch, removeKnown } from './pipeline/dedup.js';
import { keywordFilter } from './pipeline/filter.js';
import { summarizeBatch, type ModelFn } from './pipeline/summarize.js';
import { rankTop } from './pipeline/rank.js';
import { renderDigestHtml, sendDigest } from './email/digest.js';
import {
  makeDb, getKnownHashes, insertArticles, recordRun, toRow, type DigestRun,
} from './db.js';
import { shipLogs } from './monitoring.js';
import { GoogleGenAI } from '@google/genai';
import type { LogLine } from './log.js';
import { withRetry } from './util/retry.js';

export interface PipelineDeps {
  sources: Record<string, SourceFetcher>;
  model: ModelFn;
  getKnownHashes: () => Promise<Set<string>>;
  insertArticles: (rows: ReturnType<typeof toRow>[]) => Promise<number>;
  sendDigest: (html: string, subject: string, to: string) => Promise<string | null>;
  recordRun: (run: DigestRun) => Promise<void>;
  shipLogs: (lines: LogLine[]) => Promise<void>;
  meta: {
    date: string; webAppUrl: string; accessToken: string;
    recipientEmail: string; digestCount: number;
  };
}

function errStr(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
}

export async function runPipeline(deps: PipelineDeps, log: Logger): Promise<DigestRun> {
  const tPipelineStart = Date.now();
  log.info('pipeline start', {
    date: deps.meta.date,
    digestCount: deps.meta.digestCount,
    sourceCount: Object.keys(deps.sources).length,
  });

  let stats: Record<string, number> = {};
  let articlesFetched = 0;
  let articlesStored = 0;
  let emailSent = false;
  let messageId: string | null = null;
  let status = 'success';
  let errorMsg: string | null = null;

  try {
    const tFetch = Date.now();
    const { articles: raw, stats: s } = await fetchAll(deps.sources, log);
    stats = s;
    articlesFetched = raw.length;
    log.info('fetchAll done', { total: raw.length, durationMs: Date.now() - tFetch });

    const tStage = Date.now();
    const normalized = raw.map(normalize);
    const filtered = keywordFilter(normalized);
    const deduped = dedupeInBatch(filtered);
    log.info('normalize+filter+dedup done', {
      normalized: normalized.length,
      filtered: filtered.length,
      deduped: deduped.length,
      durationMs: Date.now() - tStage,
    });

    const tKnown = Date.now();
    const known = await deps.getKnownHashes();
    log.info('getKnownHashes done', { knownCount: known.size, durationMs: Date.now() - tKnown });

    const fresh = removeKnown(deduped, known);
    log.info('pipeline counts', {
      fetched: raw.length, filtered: filtered.length, fresh: fresh.length,
    });

    const tSum = Date.now();
    const summarized = await summarizeBatch(fresh, deps.model, log);
    log.info('summarize done', { count: summarized.length, durationMs: Date.now() - tSum });

    const top = rankTop(summarized, deps.meta.digestCount);
    const topHashes = new Set(top.map((a) => a.contentHash));
    log.info('rank done', { topCount: top.length, topScores: top.map((a) => a.relevanceScore) });

    const rows = summarized.map((a) =>
      toRow(a, { inDigest: topHashes.has(a.contentHash), digestDate: deps.meta.date }));
    const tInsert = Date.now();
    articlesStored = await deps.insertArticles(rows);
    log.info('insert articles done', {
      rowCount: rows.length,
      stored: articlesStored,
      durationMs: Date.now() - tInsert,
    });

    try {
      if (top.length > 0) {
        const tEmail = Date.now();
        const html = renderDigestHtml(top, {
          date: deps.meta.date, webAppUrl: deps.meta.webAppUrl, accessToken: deps.meta.accessToken,
        });
        log.info('email rendered', { topCount: top.length, htmlLen: html.length });
        const subject = `🤖 AI Digest · ${deps.meta.date} · ${top.length} stories`;
        messageId = await deps.sendDigest(html, subject, deps.meta.recipientEmail);
        emailSent = true;
        log.info('email sent', {
          messageId,
          to: deps.meta.recipientEmail,
          subject,
          durationMs: Date.now() - tEmail,
        });
      } else {
        log.warn('no articles to send', { topCount: 0 });
      }
    } catch (e) {
      status = 'partial';
      errorMsg = errStr(e);
      log.error('email send failed', { error: errorMsg });
    }
  } catch (e) {
    status = 'failed';
    errorMsg = errStr(e);
    log.error('pipeline failed', { error: errorMsg });
  }

  const run: DigestRun = {
    run_date: deps.meta.date,
    articles_fetched: articlesFetched,
    articles_stored: articlesStored,
    email_sent: emailSent,
    status,
    error: errorMsg,
    per_source_stats: stats,
  };
  try {
    const tRec = Date.now();
    await deps.recordRun(run);
    log.info('digest_run recorded', { durationMs: Date.now() - tRec });
  } catch (e) {
    log.error('recordRun failed', { error: errStr(e) });
  }

  log.info('pipeline end', {
    status,
    stored: articlesStored,
    emailSent,
    messageId,
    totalDurationMs: Date.now() - tPipelineStart,
  });

  try {
    const tShip = Date.now();
    const lineCount = log.lines().length;
    await deps.shipLogs(log.lines());
    console.error(JSON.stringify({
      level: 'info', msg: 'logs shipped', lineCount, durationMs: Date.now() - tShip,
    }));
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: 'shipLogs failed', error: errStr(e) }));
  }
  return run;
}

async function main(): Promise<void> {
  const tMainStart = Date.now();
  const log = createLogger();
  log.info('run started', {
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
  });

  const cfg = loadConfig(process.env);
  log.info('config loaded', {
    hasGeminiKey: Boolean(cfg.geminiApiKey),
    supabaseUrlHost: new URL(cfg.supabaseUrl).host,
    recipientEmail: cfg.recipientEmail,
    webAppUrl: cfg.webAppUrl,
  });

  const db = makeDb(cfg.supabaseUrl, cfg.supabaseServiceKey);
  const genai = new GoogleGenAI({ apiKey: cfg.geminiApiKey });
  const geminiModel = 'gemini-3.5-flash';
  const model: ModelFn = async (prompt) => {
    const tModel = Date.now();
    const result = await withRetry(
      () => genai.models.generateContent({ model: geminiModel, contents: prompt }),
      {
        maxAttempts: 3,
        baseDelayMs: 2000,
        onRetry: (attempt, e, delayMs) => {
          const obj = e as { status?: number; message?: string } | null;
          log.warn('gemini retry', {
            attempt,
            delayMs,
            status: obj?.status ?? null,
            error: obj?.message ?? String(e),
          });
        },
      },
    );
    log.info('gemini api call', {
      model: geminiModel,
      promptLen: prompt.length,
      responseLen: (result.text ?? '').length,
      durationMs: Date.now() - tModel,
    });
    return result.text ?? '';
  };
  const date = new Date().toISOString().slice(0, 10);

  const run = await runPipeline(
    {
      sources: SOURCES,
      model,
      getKnownHashes: () => getKnownHashes(db),
      insertArticles: (rows) => insertArticles(db, rows),
      sendDigest: (html, subject, to) => sendDigest(html, subject, to, cfg.resendApiKey),
      recordRun: (r) => recordRun(db, r),
      shipLogs: (lines) => shipLogs(lines, cfg.datadogApiKey),
      meta: {
        date, webAppUrl: cfg.webAppUrl, accessToken: cfg.accessToken,
        recipientEmail: cfg.recipientEmail, digestCount: 10,
      },
    },
    log,
  );
  console.error(JSON.stringify({
    level: 'info',
    msg: 'run complete',
    status: run.status,
    stored: run.articles_stored,
    emailSent: run.email_sent,
    error: run.error,
    totalDurationMs: Date.now() - tMainStart,
  }));
  if (run.status === 'failed') process.exit(1);
}

function serializeError(e: unknown): unknown {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack };
  }
  if (typeof e === 'object' && e !== null) {
    try {
      return JSON.parse(JSON.stringify(e));
    } catch {
      return String(e);
    }
  }
  return String(e);
}

// Run main only when executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(JSON.stringify({ level: 'error', msg: 'fatal', error: serializeError(e) }));
    process.exit(1);
  });
}
