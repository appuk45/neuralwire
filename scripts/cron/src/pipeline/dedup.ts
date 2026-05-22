import type { Article } from '../types.js';

export function dedupeInBatch(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    if (seen.has(a.contentHash)) continue;
    seen.add(a.contentHash);
    out.push(a);
  }
  return out;
}

export function removeKnown(articles: Article[], knownHashes: Set<string>): Article[] {
  return articles.filter((a) => !knownHashes.has(a.contentHash));
}
