import { describe, it, expect, vi } from 'vitest';
import { fetchAll } from '../../src/sources/index.js';
import { createLogger } from '../../src/log.js';
import type { RawArticle } from '../../src/types.js';

const ok = (source: string): (() => Promise<RawArticle[]>) => async () => [
  { source, sourceUrl: `https://x/${source}`, title: `t-${source}` },
];
const fail = () => async (): Promise<RawArticle[]> => { throw new Error('boom'); };

describe('fetchAll', () => {
  it('collects articles from all sources and isolates failures', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger();
    const { articles, stats } = await fetchAll(
      { good1: ok('good1'), bad: fail(), good2: ok('good2') },
      log,
    );
    expect(articles).toHaveLength(2);
    expect(stats.good1).toBe(1);
    expect(stats.good2).toBe(1);
    expect(stats.bad).toBe(0);
  });
});
