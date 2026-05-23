import Parser from 'rss-parser';
import type { RawArticle } from '../types.js';

export type SourceFetcher = () => Promise<RawArticle[]>;

const WINDOW_MS = 24 * 3600 * 1000;
const parser = new Parser();

export function makeRssSource(source: string, feedUrls: string[]): SourceFetcher {
  return async () => {
    const cutoff = Date.now() - WINDOW_MS;
    const all: RawArticle[] = [];
    for (const url of feedUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(JSON.stringify({ level: 'warn', msg: 'rss feed http error', source, url, status: res.status }));
          continue;
        }
        const xml = await res.text();
        const feed = await parser.parseString(xml);
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
        }
      } catch (e) {
        console.error(JSON.stringify({ level: 'warn', msg: 'rss feed failed', source, url, error: e instanceof Error ? e.message : String(e) }));
      }
    }
    return all;
  };
}
