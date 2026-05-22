import { z } from 'zod';
import type { Article, SummarizedArticle } from '../types.js';

// Callable that takes a prompt and returns the model's text output.
export type ModelFn = (prompt: string) => Promise<string>;

const itemSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  categories: z.array(z.string()),
  relevanceScore: z.number().min(0).max(1),
});

export function fallbackSummary(a: Article): SummarizedArticle {
  return {
    ...a,
    headline: a.title,
    summary: (a.rawText ?? '').slice(0, 200) || a.title,
    categories: [],
    relevanceScore: 0.3,
  };
}

const BATCH_SIZE = 10;

function buildPrompt(batch: Article[]): string {
  const items = batch.map((a, i) => `[${i}] TITLE: ${a.title}\nTEXT: ${(a.rawText ?? '').slice(0, 500)}`).join('\n\n');
  return `You are an AI-news editor. For each numbered item below, produce a JSON object with:
- "headline": a punchy <=90 char headline
- "summary": a 2-line (<=240 char) plain summary
- "categories": subset of ["GenAI","CV","ML","DL","Agentic","Research","Products"]
- "relevanceScore": 0..1, how relevant to an AI/ML practitioner

Return ONLY a JSON array of these objects, in the same order as the items. No markdown, no prose.

ITEMS:
${items}`;
}

export async function summarizeBatch(articles: Article[], model: ModelFn): Promise<SummarizedArticle[]> {
  const out: SummarizedArticle[] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    let parsed: unknown;
    try {
      const text = await model(buildPrompt(batch));
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = null;
    }
    const arr = Array.isArray(parsed) ? parsed : [];
    batch.forEach((a, idx) => {
      const candidate = itemSchema.safeParse(arr[idx]);
      out.push(candidate.success ? { ...a, ...candidate.data } : fallbackSummary(a));
    });
  }
  return out;
}
