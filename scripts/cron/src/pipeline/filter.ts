import type { Article } from '../types.js';

// Sources that are AI-only by definition; never keyword-filter them.
const ALWAYS_KEEP_SOURCES = new Set(['arxiv', 'huggingface', 'paperswithcode']);

const KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'neural network', 'transformer', 'llm', 'large language model', 'gpt',
  'diffusion', 'generative', 'genai', 'computer vision', 'reinforcement learning',
  'agent', 'agentic', 'embedding', 'fine-tune', 'fine-tuning', 'model', 'dataset',
  'inference', 'training', 'multimodal', 'rag', 'foundation model',
];

function matches(text: string): boolean {
  const t = text.toLowerCase();
  return KEYWORDS.some((k) => new RegExp(`\\b${k.replace(/[-/]/g, '\\$&')}\\b`).test(t));
}

export function keywordFilter(articles: Article[]): Article[] {
  return articles.filter((a) => {
    if (ALWAYS_KEEP_SOURCES.has(a.source)) return true;
    return matches(`${a.title} ${a.rawText ?? ''}`);
  });
}
