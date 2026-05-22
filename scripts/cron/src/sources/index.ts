import type { RawArticle } from '../types.js';
import type { Logger } from '../log.js';
import type { SourceFetcher } from './rss.js';
import { arxivSource } from './arxiv.js';
import { blogsSource } from './blogs.js';
import { technewsSource } from './technews.js';
import { papersWithCodeSource } from './paperswithcode.js';
import { redditSource } from './reddit.js';
import { huggingfaceSource } from './huggingface.js';
import { githubSource } from './github.js';

export const SOURCES: Record<string, SourceFetcher> = {
  arxiv: arxivSource,
  blogs: blogsSource,
  technews: technewsSource,
  paperswithcode: papersWithCodeSource,
  reddit: redditSource,
  huggingface: huggingfaceSource,
  github: githubSource,
};

export interface FetchAllResult {
  articles: RawArticle[];
  stats: Record<string, number>;
}

export async function fetchAll(
  sources: Record<string, SourceFetcher>,
  log: Logger,
): Promise<FetchAllResult> {
  const stats: Record<string, number> = {};
  const results = await Promise.allSettled(
    Object.entries(sources).map(async ([name, fn]) => {
      const items = await fn();
      return { name, items };
    }),
  );
  const articles: RawArticle[] = [];
  for (const [name] of Object.entries(sources)) stats[name] = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      stats[r.value.name] = r.value.items.length;
      articles.push(...r.value.items);
      log.info('source fetched', { source: r.value.name, count: r.value.items.length });
    } else {
      log.error('source failed', { error: String(r.reason) });
    }
  }
  return { articles, stats };
}
