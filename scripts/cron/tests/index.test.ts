import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/index.js';
import { createLogger } from '../src/log.js';
import type { RawArticle } from '../src/types.js';

describe('runPipeline', () => {
  it('runs end to end with injected deps and reports a successful run', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger();

    const raw: RawArticle[] = [
      { source: 'arxiv', sourceUrl: 'https://a', title: 'Transformer paper', rawText: 'x' },
      { source: 'technews', sourceUrl: 'https://b', title: 'Bakery opens', rawText: 'bread' },
    ];

    const deps = {
      sources: { arxiv: async () => [raw[0]], technews: async () => [raw[1]] },
      model: async (_p: string) => JSON.stringify([
        { headline: 'H', summary: 'S', categories: ['ML'], relevanceScore: 0.9 },
      ]),
      getKnownHashes: async () => new Set<string>(),
      insertArticles: vi.fn(async (rows: unknown[]) => rows.length),
      sendDigest: vi.fn(async () => {}),
      recordRun: vi.fn(async () => {}),
      shipLogs: vi.fn(async () => {}),
      meta: { date: '2026-05-22', webAppUrl: 'https://x', accessToken: 't', recipientEmail: 'me@x', digestCount: 10 },
    };

    const run = await runPipeline(deps, log);

    // Bakery article is keyword-filtered out; only the transformer paper survives.
    expect(run.status).toBe('success');
    expect(run.articles_stored).toBe(1);
    expect(run.email_sent).toBe(true);
    expect(deps.insertArticles).toHaveBeenCalledOnce();
    expect(deps.sendDigest).toHaveBeenCalledOnce();
    expect(deps.recordRun).toHaveBeenCalledOnce();
  });

  it('marks run partial when email send throws', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger();
    const deps = {
      sources: { arxiv: async () => [{ source: 'arxiv', sourceUrl: 'https://a', title: 'LLM paper', rawText: 'x' }] },
      model: async () => JSON.stringify([{ headline: 'H', summary: 'S', categories: ['ML'], relevanceScore: 0.9 }]),
      getKnownHashes: async () => new Set<string>(),
      insertArticles: async () => 1,
      sendDigest: async () => { throw new Error('mail down'); },
      recordRun: vi.fn(async () => {}),
      shipLogs: async () => {},
      meta: { date: '2026-05-22', webAppUrl: 'https://x', accessToken: 't', recipientEmail: 'me@x', digestCount: 10 },
    };
    const run = await runPipeline(deps, log);
    expect(run.status).toBe('partial');
    expect(run.email_sent).toBe(false);
    expect(run.articles_stored).toBe(1);
  });
});
