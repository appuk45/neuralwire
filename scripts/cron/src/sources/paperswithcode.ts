import { makeRssSource } from './rss.js';

export const papersWithCodeSource = makeRssSource('paperswithcode', [
  'https://paperswithcode.com/latest/rss',
]);
