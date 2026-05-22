import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeRssSource } from '../../src/sources/rss.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function feedXml(): string {
  const recent = new Date(Date.now() - 2 * 3600 * 1000).toUTCString();
  const old = new Date(Date.now() - 8 * 24 * 3600 * 1000).toUTCString();
  return readFileSync(join(__dirname, '../fixtures/sample-feed.xml'), 'utf8')
    .replace('__RECENT__', recent)
    .replace('__OLD__', old);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(feedXml(), { headers: { 'content-type': 'application/xml' } })));
});

describe('makeRssSource', () => {
  it('returns only items published within the last 24h', async () => {
    const fetcher = makeRssSource('test_src', ['https://feed.example/rss']);
    const items = await fetcher();
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Recent Model Release');
    expect(items[0].source).toBe('test_src');
    expect(items[0].sourceUrl).toBe('https://example.com/recent');
  });
});
