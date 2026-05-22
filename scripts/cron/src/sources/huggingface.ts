import type { RawArticle } from '../types.js';
import type { SourceFetcher } from './rss.js';

const WINDOW_MS = 24 * 3600 * 1000;

interface HfEntry {
  paper: { id: string; title: string; publishedAt?: string; summary?: string };
}

export const huggingfaceSource: SourceFetcher = async () => {
  const cutoff = Date.now() - WINDOW_MS;
  const res = await fetch('https://huggingface.co/api/daily_papers');
  const json = (await res.json()) as HfEntry[];
  const out: RawArticle[] = [];
  for (const e of json) {
    const ts = e.paper.publishedAt ? Date.parse(e.paper.publishedAt) : Date.now();
    if (ts < cutoff) continue;
    out.push({
      source: 'huggingface',
      sourceUrl: `https://huggingface.co/papers/${e.paper.id}`,
      title: e.paper.title,
      rawText: e.paper.summary ?? '',
      publishedAt: new Date(ts).toISOString(),
    });
  }
  return out;
};
