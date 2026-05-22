import { makeRssSource } from './rss.js';

// arXiv category RSS feeds (cs.LG, cs.AI, cs.CV, cs.CL).
export const arxivSource = makeRssSource('arxiv', [
  'https://rss.arxiv.org/rss/cs.LG',
  'https://rss.arxiv.org/rss/cs.AI',
  'https://rss.arxiv.org/rss/cs.CV',
  'https://rss.arxiv.org/rss/cs.CL',
]);
