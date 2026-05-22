import { describe, it, expect } from 'vitest';
import { rankTop } from '../../src/pipeline/rank.js';
import type { SummarizedArticle } from '../../src/types.js';

const make = (score: number): SummarizedArticle => ({
  source: 'arxiv', sourceUrl: 'https://x', title: 't', contentHash: String(score),
  headline: 'h', summary: 's', categories: [], relevanceScore: score,
});

describe('rankTop', () => {
  it('returns the highest-scoring N in descending order', () => {
    const out = rankTop([make(0.2), make(0.9), make(0.5), make(0.7)], 2);
    expect(out.map((a) => a.relevanceScore)).toEqual([0.9, 0.7]);
  });

  it('returns all when fewer than N', () => {
    expect(rankTop([make(0.1)], 10)).toHaveLength(1);
  });
});
