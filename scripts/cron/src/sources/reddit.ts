import type { RawArticle } from '../types.js';
import type { SourceFetcher } from './rss.js';
import { fetchWithTimeout } from '../util/fetchWithTimeout.js';

const SUBREDDITS = ['MachineLearning', 'LocalLLaMA', 'artificial'];
const WINDOW_MS = 24 * 3600 * 1000;

interface RedditChild {
  data: { title: string; url: string; permalink: string; created_utc: number; selftext?: string };
}

export const redditSource: SourceFetcher = async () => {
  const cutoff = Date.now() - WINDOW_MS;
  const out: RawArticle[] = [];
  for (const sub of SUBREDDITS) {
    try {
      const res = await fetchWithTimeout(
        `https://www.reddit.com/r/${sub}/new.json?limit=50`,
        {
          headers: {
            'User-Agent': 'web:neuralwire:v1.0 (by /u/appuk45)',
            'Accept': 'application/json',
          },
        },
      );
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('application/json')) {
        console.error(JSON.stringify({ level: 'warn', msg: 'reddit sub blocked or non-json', sub, status: res.status, contentType }));
        continue;
      }
      const json = (await res.json()) as { data: { children: RedditChild[] } };
      for (const child of json.data.children) {
        const d = child.data;
        const ts = d.created_utc * 1000;
        if (ts < cutoff) continue;
        out.push({
          source: 'reddit',
          sourceUrl: `https://www.reddit.com${d.permalink}`,
          title: d.title,
          rawText: d.selftext ?? '',
          publishedAt: new Date(ts).toISOString(),
        });
      }
    } catch (e) {
      console.error(JSON.stringify({ level: 'warn', msg: 'reddit sub failed', sub, error: e instanceof Error ? e.message : String(e) }));
    }
  }
  return out;
};
