import { describe, it, expect } from 'vitest';
import { toRow } from '../src/db.js';
import type { SummarizedArticle } from '../src/types.js';

const a: SummarizedArticle = {
  source: 'arxiv', sourceUrl: 'https://x', title: 'orig', contentHash: 'h',
  headline: 'H', summary: 'S', categories: ['ML'], relevanceScore: 0.7,
  publishedAt: '2026-05-22T01:00:00.000Z',
};

describe('toRow', () => {
  it('maps a SummarizedArticle to a snake_case DB row', () => {
    const row = toRow(a, { inDigest: true, digestDate: '2026-05-22' });
    expect(row.source).toBe('arxiv');
    expect(row.source_url).toBe('https://x');
    expect(row.original_title).toBe('orig');
    expect(row.content_hash).toBe('h');
    expect(row.relevance_score).toBe(0.7);
    expect(row.in_digest).toBe(true);
    expect(row.digest_date).toBe('2026-05-22');
  });
});
