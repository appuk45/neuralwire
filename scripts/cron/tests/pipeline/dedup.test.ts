import { describe, it, expect } from 'vitest';
import { dedupeInBatch, removeKnown } from '../../src/pipeline/dedup.js';
import type { Article } from '../../src/types.js';

const make = (hash: string, source = 'arxiv'): Article => ({
  source, sourceUrl: `https://x/${hash}`, title: hash, contentHash: hash,
});

describe('dedupeInBatch', () => {
  it('keeps one article per contentHash', () => {
    const out = dedupeInBatch([make('a'), make('a', 'reddit'), make('b')]);
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.contentHash).sort()).toEqual(['a', 'b']);
  });
});

describe('removeKnown', () => {
  it('drops articles whose hash is already stored', () => {
    const out = removeKnown([make('a'), make('b'), make('c')], new Set(['b']));
    expect(out.map((x) => x.contentHash).sort()).toEqual(['a', 'c']);
  });
});
