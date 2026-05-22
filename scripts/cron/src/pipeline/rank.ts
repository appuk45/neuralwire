import type { SummarizedArticle } from '../types.js';

export function rankTop(articles: SummarizedArticle[], n: number): SummarizedArticle[] {
  return [...articles].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, n);
}
