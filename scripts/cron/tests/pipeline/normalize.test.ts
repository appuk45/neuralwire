import { describe, it, expect } from 'vitest';
import { normalize } from '../../src/pipeline/normalize.js';
import type { RawArticle } from '../../src/types.js';

const raw: RawArticle = {
  source: 'arxiv',
  sourceUrl: 'https://arxiv.org/abs/1234',
  title: '  Attention Is All You Need!  ',
};

describe('normalize', () => {
  it('adds a contentHash derived from the normalized title', () => {
    const a = normalize(raw);
    expect(a.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash for titles differing only in case/whitespace/punctuation', () => {
    const a = normalize(raw);
    const b = normalize({ ...raw, title: 'attention is all you need' });
    expect(a.contentHash).toBe(b.contentHash);
  });

  it('produces different hashes for different titles', () => {
    const a = normalize(raw);
    const b = normalize({ ...raw, title: 'A totally different paper' });
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});
