import { makeRssSource } from './rss.js';

export const technewsSource = makeRssSource('technews', [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://venturebeat.com/category/ai/feed/',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
]);
