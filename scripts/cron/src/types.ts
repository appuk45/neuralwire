// Raw item as returned by a source fetcher, before processing.
export interface RawArticle {
  source: string;        // 'arxiv', 'openai_blog', 'reddit_ml'
  sourceUrl: string;     // original link
  title: string;         // original title
  rawText?: string;      // optional body/excerpt for summarization
  publishedAt?: string;  // ISO string if known
}

// Normalized article ready for dedup/filter/storage.
export interface Article extends RawArticle {
  contentHash: string;   // sha256 of normalized title
}

// Output of Gemini summarization, merged with Article for storage.
export interface SummarizedArticle extends Article {
  headline: string;
  summary: string;
  categories: string[];
  relevanceScore: number; // 0..1
}

export const CATEGORIES = [
  'GenAI', 'CV', 'ML', 'DL', 'Agentic', 'Research', 'Products',
] as const;
export type Category = (typeof CATEGORIES)[number];
