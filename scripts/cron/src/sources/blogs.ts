import { makeRssSource } from './rss.js';

export const blogsSource = makeRssSource('blogs', [
  'https://openai.com/blog/rss.xml',
  'https://deepmind.google/blog/rss.xml',
  'https://blog.google/technology/ai/rss/',
  'https://www.microsoft.com/en-us/research/feed/',
]);
