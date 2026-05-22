import type { RawArticle } from '../types.js';
import type { SourceFetcher } from './rss.js';

interface Repo {
  full_name: string;
  html_url: string;
  description: string | null;
  pushed_at: string;
  stargazers_count: number;
}

export const githubSource: SourceFetcher = async () => {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const q = encodeURIComponent(
    `topic:machine-learning topic:llm topic:deep-learning pushed:>=${since}`,
  );
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'neuralwire/1.0' },
  });
  const json = (await res.json()) as { items: Repo[] };
  return (json.items ?? []).map((r) => ({
    source: 'github',
    sourceUrl: r.html_url,
    title: `${r.full_name} (★${r.stargazers_count})`,
    rawText: r.description ?? '',
    publishedAt: r.pushed_at,
  }));
};
