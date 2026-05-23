import { describe, it, expect, vi } from 'vitest';
import { toRow, cleanupStaleArticles } from '../src/db.js';
import type { SummarizedArticle } from '../src/types.js';
import type { SupabaseClient } from '@supabase/supabase-js';

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

describe('cleanupStaleArticles', () => {
  function mockDb(result: { count: number | null; error: { message: string } | null }) {
    const lt = vi.fn().mockResolvedValue(result);
    const eq = vi.fn(() => ({ lt }));
    const del = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: del }));
    return { db: { from } as unknown as SupabaseClient, from, del, eq, lt };
  }

  it('deletes non-digest articles older than cutoff and returns count', async () => {
    const { db, from, del, eq, lt } = mockDb({ count: 7, error: null });
    const count = await cleanupStaleArticles(db, 30);
    expect(count).toBe(7);
    expect(from).toHaveBeenCalledWith('articles');
    expect(del).toHaveBeenCalledWith({ count: 'exact' });
    expect(eq).toHaveBeenCalledWith('in_digest', false);
    expect(lt).toHaveBeenCalledWith('fetched_at', expect.any(String));
    const cutoff = new Date(lt.mock.calls[0][1] as string).getTime();
    const expected = Date.now() - 30 * 24 * 3600 * 1000;
    expect(Math.abs(cutoff - expected)).toBeLessThan(5000);
  });

  it('returns 0 when supabase returns null count', async () => {
    const { db } = mockDb({ count: null, error: null });
    const count = await cleanupStaleArticles(db, 30);
    expect(count).toBe(0);
  });

  it('throws when supabase returns error', async () => {
    const { db } = mockDb({ count: null, error: { message: 'permission denied' } });
    await expect(cleanupStaleArticles(db, 30)).rejects.toMatchObject({ message: 'permission denied' });
  });

  it('uses custom days param for cutoff', async () => {
    const { db, lt } = mockDb({ count: 0, error: null });
    await cleanupStaleArticles(db, 7);
    const cutoff = new Date(lt.mock.calls[0][1] as string).getTime();
    const expected = Date.now() - 7 * 24 * 3600 * 1000;
    expect(Math.abs(cutoff - expected)).toBeLessThan(5000);
  });
});
