import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SummarizedArticle } from './types.js';

export interface ArticleRow {
  source: string;
  source_url: string;
  original_title: string;
  headline: string;
  summary: string;
  categories: string[];
  relevance_score: number;
  published_at: string | null;
  content_hash: string;
  in_digest: boolean;
  digest_date: string | null;
}

export function toRow(
  a: SummarizedArticle,
  opts: { inDigest: boolean; digestDate: string },
): ArticleRow {
  return {
    source: a.source,
    source_url: a.sourceUrl,
    original_title: a.title,
    headline: a.headline,
    summary: a.summary,
    categories: a.categories,
    relevance_score: a.relevanceScore,
    published_at: a.publishedAt ?? null,
    content_hash: a.contentHash,
    in_digest: opts.inDigest,
    digest_date: opts.digestDate,
  };
}

export function makeDb(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function getKnownHashes(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from('articles').select('content_hash');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.content_hash as string));
}

export async function insertArticles(db: SupabaseClient, rows: ArticleRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await db
    .from('articles')
    .upsert(rows, { onConflict: 'content_hash', ignoreDuplicates: true, count: 'exact' });
  if (error) throw error;
  return count ?? rows.length;
}

export interface DigestRun {
  run_date: string;
  articles_fetched: number;
  articles_stored: number;
  email_sent: boolean;
  status: string;
  error: string | null;
  per_source_stats: Record<string, number>;
}

export async function recordRun(db: SupabaseClient, run: DigestRun): Promise<void> {
  const { error } = await db.from('digest_runs').insert(run);
  if (error) throw error;
}

export async function cleanupStaleArticles(
  db: SupabaseClient,
  olderThanDays: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600 * 1000).toISOString();
  const { count, error } = await db
    .from('articles')
    .delete({ count: 'exact' })
    .eq('in_digest', false)
    .lt('fetched_at', cutoff);
  if (error) throw error;
  return count ?? 0;
}
