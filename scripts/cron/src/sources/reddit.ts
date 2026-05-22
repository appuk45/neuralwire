import type { RawArticle } from '../types.js';
import type { SourceFetcher } from './rss.js';

const SUBREDDITS = ['MachineLearning', 'LocalLLaMA', 'artificial'];
const WINDOW_MS = 24 * 3600 * 1000;

interface RedditChild {
  data: { title: string; url: string; permalink: string; created_utc: number; selftext?: string };
}

export const redditSource: SourceFetcher = async () => {
  const cutoff = Date.now() - WINDOW_MS;
  const out: RawArticle[] = [];
  for (const sub of SUBREDDITS) {
    const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=50`, {
      headers: { 'User-Agent': 'neuralwire/1.0' },
    });
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
  }
  return out;
};
