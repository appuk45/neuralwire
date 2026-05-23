import { describe, it, expect } from 'vitest';
import { summarizeBatch, fallbackSummary } from '../../src/pipeline/summarize.js';
import type { Article } from '../../src/types.js';

const make = (title: string): Article => ({
  source: 'arxiv', sourceUrl: 'https://x', title, rawText: 'body', contentHash: title,
});

describe('summarizeBatch', () => {
  it('merges Gemini JSON output back onto articles by index', async () => {
    const articles = [make('A'), make('B')];
    const fakeModel = async (_prompt: string) => JSON.stringify([
      { headline: 'HA', summary: 'SA', categories: ['ML'], relevanceScore: 0.9 },
      { headline: 'HB', summary: 'SB', categories: ['CV'], relevanceScore: 0.4 },
    ]);
    const out = await summarizeBatch(articles, fakeModel);
    expect(out[0].headline).toBe('HA');
    expect(out[0].relevanceScore).toBe(0.9);
    expect(out[1].categories).toEqual(['CV']);
  });

  it('uses fallback when the model output is unparseable', async () => {
    const articles = [make('Some Title')];
    const fakeModel = async () => 'not json at all';
    const out = await summarizeBatch(articles, fakeModel);
    expect(out[0].headline).toBe('Some Title');
    expect(out[0].relevanceScore).toBe(0.3);
  });
});

describe('fallbackSummary', () => {
  it('builds a SummarizedArticle from the raw article', () => {
    const a = make('Title');
    const s = fallbackSummary(a);
    expect(s.headline).toBe('Title');
    expect(s.categories).toEqual([]);
  });
});

describe('summarizeBatch category filtering', () => {
  it('drops invalid categories but keeps valid ones', async () => {
    const articles = [make('A')];
    const fakeModel = async () => JSON.stringify([
      { headline: 'H', summary: 'S', categories: ['ML', 'Misc', 'CV', 'NotARealCat'], relevanceScore: 0.8 },
    ]);
    const out = await summarizeBatch(articles, fakeModel);
    expect(out[0].categories).toEqual(['ML', 'CV']);
    expect(out[0].headline).toBe('H');
  });

  it('keeps article with empty categories if all were invalid', async () => {
    const articles = [make('A')];
    const fakeModel = async () => JSON.stringify([
      { headline: 'H', summary: 'S', categories: ['Misc', 'Fake'], relevanceScore: 0.8 },
    ]);
    const out = await summarizeBatch(articles, fakeModel);
    expect(out[0].categories).toEqual([]);
    expect(out[0].headline).toBe('H');
    expect(out[0].relevanceScore).toBe(0.8);
  });
});
