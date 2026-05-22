import { describe, it, expect } from 'vitest';
import { renderDigestHtml } from '../../src/email/digest.js';
import type { SummarizedArticle } from '../../src/types.js';

const make = (headline: string): SummarizedArticle => ({
  source: 'arxiv', sourceUrl: 'https://example.com/post', title: 't', contentHash: headline,
  headline, summary: 'A short summary.', categories: ['ML'], relevanceScore: 0.8,
});

describe('renderDigestHtml', () => {
  it('includes each headline and links to the source url', () => {
    const html = renderDigestHtml([make('First Story'), make('Second Story')], {
      date: '2026-05-22', webAppUrl: 'https://ainews.me', accessToken: 'tok',
    });
    expect(html).toContain('First Story');
    expect(html).toContain('Second Story');
    expect(html).toContain('https://example.com/post');
  });

  it('includes a View-all button linking to the web app with the access token', () => {
    const html = renderDigestHtml([make('S')], {
      date: '2026-05-22', webAppUrl: 'https://ainews.me', accessToken: 'tok',
    });
    expect(html).toContain('https://ainews.me/?key=tok');
    expect(html.toLowerCase()).toContain('view all');
  });
});
