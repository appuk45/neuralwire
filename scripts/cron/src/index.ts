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

export interface PipelineDeps {
  sources: Record<string, SourceFetcher>;
  model: ModelFn;
  getKnownHashes: () => Promise<Set<string>>;
  insertArticles: (rows: ReturnType<typeof toRow>[]) => Promise<number>;
  sendDigest: (html: string, subject: string, to: string) => Promise<void>;
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
  let stats: Record<string, number> = {};
  let articlesFetched = 0;
  let articlesStored = 0;
  let emailSent = false;
  let status = 'success';
  let errorMsg: string | null = null;

  try {
    const { articles: raw, stats: s } = await fetchAll(deps.sources, log);
    stats = s;
    articlesFetched = raw.length;
    const normalized = raw.map(normalize);
    const filtered = keywordFilter(normalized);
    const deduped = dedupeInBatch(filtered);
    const known = await deps.getKnownHashes();
    const fresh = removeKnown(deduped, known);
    log.info('pipeline counts', {
      fetched: raw.length, filtered: filtered.length, fresh: fresh.length,
    });

    const summarized = await summarizeBatch(fresh, deps.model);
    const top = rankTop(summarized, deps.meta.digestCount);
    const topHashes = new Set(top.map((a) => a.contentHash));

    const rows = summarized.map((a) =>
      toRow(a, { inDigest: topHashes.has(a.contentHash), digestDate: deps.meta.date }));
    articlesStored = await deps.insertArticles(rows);

    try {
      if (top.length > 0) {
        const html = renderDigestHtml(top, {
          date: deps.meta.date, webAppUrl: deps.meta.webAppUrl, accessToken: deps.meta.accessToken,
        });
        const subject = `🤖 AI Digest · ${deps.meta.date} · ${top.length} stories`;
        await deps.sendDigest(html, subject, deps.meta.recipientEmail);
        emailSent = true;
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
    await deps.recordRun(run);
  } catch (e) {
    log.error('recordRun failed', { error: errStr(e) });
  }
  try {
    await deps.shipLogs(log.lines());
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: 'shipLogs failed', error: errStr(e) }));
  }
  return run;
}

async function main(): Promise<void> {
  const log = createLogger();
  const cfg = loadConfig(process.env);
  const db = makeDb(cfg.supabaseUrl, cfg.supabaseServiceKey);
  const genai = new GoogleGenAI({ apiKey: cfg.geminiApiKey });
  const model: ModelFn = async (prompt) => {
    const result = await genai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
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
  log.info('run complete', { status: run.status, stored: run.articles_stored });
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
