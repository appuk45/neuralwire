import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redditSource } from '../../src/sources/reddit.js';

function listing(createdSecAgo: number) {
  return {
    data: {
      children: [
        {
          data: {
            title: 'New SOTA on benchmark',
            url: 'https://arxiv.org/abs/9999',
            permalink: '/r/MachineLearning/comments/abc/new_sota/',
            created_utc: Math.floor(Date.now() / 1000) - createdSecAgo,
            selftext: 'details here',
          },
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify(listing(3600)), { headers: { 'content-type': 'application/json' } })));
});

describe('redditSource', () => {
  it('maps recent posts to RawArticle, linking to the reddit permalink', async () => {
    const items = await redditSource();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].source).toBe('reddit');
    expect(items[0].sourceUrl).toContain('reddit.com');
    expect(items[0].title).toBe('New SOTA on benchmark');
  });

  it('skips posts older than 24h', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify(listing(2 * 24 * 3600)), { headers: { 'content-type': 'application/json' } })));
    const items = await redditSource();
    expect(items).toHaveLength(0);
  });
});
