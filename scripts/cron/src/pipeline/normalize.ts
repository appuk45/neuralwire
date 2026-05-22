import { createHash } from 'node:crypto';
import type { RawArticle, Article } from '../types.js';

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalize(raw: RawArticle): Article {
  const contentHash = createHash('sha256')
    .update(normalizeTitle(raw.title))
    .digest('hex');
  return { ...raw, contentHash };
}
