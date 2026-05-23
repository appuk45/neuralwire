import Parser from 'rss-parser';
import type { RawArticle } from '../types.js';
import type { Logger } from '../log.js';
import { fetchWithTimeout } from '../util/fetchWithTimeout.js';

export type SourceFetcher = (log?: Logger) => Promise<RawArticle[]>;

const WINDOW_MS = 24 * 3600 * 1000;
const parser = new Parser();

export function makeRssSource(source: string, feedUrls: string[]): SourceFetcher {
  return async (log) => {
    const cutoff = Date.now() - WINDOW_MS;
    const all: RawArticle[] = [];
    for (const url of feedUrls) {
      const tFeed = Date.now();
      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) {
          log?.warn('rss feed http error', { source, url, status: res.status, durationMs: Date.now() - tFeed });
          continue;
        }
        const xml = await res.text();
        const feed = await parser.parseString(xml);
        let kept = 0;
        for (const item of feed.items) {
          const pub = item.isoDate ?? item.pubDate;
          const ts = pub ? Date.parse(pub) : NaN;
          if (!Number.isNaN(ts) && ts < cutoff) continue;
          if (!item.title || !item.link) continue;
          all.push({
            source,
            sourceUrl: item.link,
            title: item.title,
            rawText: item.contentSnippet ?? item.content ?? '',
            publishedAt: pub ? new Date(ts).toISOString() : undefined,
          });
          kept++;
        }
        log?.info('rss feed fetched', {
          source,
          url,
          kept,
          totalItems: feed.items.length,
          durationMs: Date.now() - tFeed,
        });
      } catch (e) {
        log?.warn('rss feed failed', {
          source,
          url,
          error: e instanceof Error ? e.message : String(e),
          durationMs: Date.now() - tFeed,
        });
      }
    }
    return all;
  };
}
