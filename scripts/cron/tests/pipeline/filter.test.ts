import { describe, it, expect } from 'vitest';
import { keywordFilter } from '../../src/pipeline/filter.js';
import type { Article } from '../../src/types.js';

const make = (title: string, rawText = ''): Article => ({
  source: 'technews', sourceUrl: 'https://x', title, rawText, contentHash: title,
});

describe('keywordFilter', () => {
  it('keeps articles mentioning AI/ML terms', () => {
    const out = keywordFilter([
      make('New transformer model beats GPT-4'),
      make('Diffusion models for image generation'),
    ]);
    expect(out).toHaveLength(2);
  });

  it('drops obviously unrelated articles', () => {
    const out = keywordFilter([
      make('Local bakery wins award'),
      make('Stock market dips on Tuesday'),
    ]);
    expect(out).toHaveLength(0);
  });

  it('matches keywords in rawText too', () => {
    const out = keywordFilter([make('Big news', 'uses a neural network for forecasting')]);
    expect(out).toHaveLength(1);
  });

  it('keeps articles from research sources regardless of keywords', () => {
    const arxiv: Article = { source: 'arxiv', sourceUrl: 'https://x', title: 'Untitled', contentHash: 'h' };
    expect(keywordFilter([arxiv])).toHaveLength(1);
  });
});
