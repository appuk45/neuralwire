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
  const items = batch
    .map((a, i) => `[${i}] SOURCE: ${a.source}\nORIGINAL_TITLE: ${a.title}\nTEXT: ${(a.rawText ?? '').slice(0, 1200)}`)
    .join('\n\n');
  return `You are the editor of a daily AI/ML newsletter for engineers and researchers. For each numbered item, write a sharp card.

Output a JSON object per item with these fields:

1. "headline" (string, 50–80 chars): REWRITE the original title into a concrete, informative claim. Lead with the actor (who) and the action (what is new). No clickbait, no hype words ("revolutionary", "game-changing", "stunning"), no vague language. Do NOT just copy ORIGINAL_TITLE.

2. "summary" (string, exactly 2 sentences, 150–230 chars total):
   - Sentence 1: What was announced / discovered / released. Be specific (name, model size, benchmark, mechanism).
   - Sentence 2: Why it matters — novelty, comparison to prior work, practical impact, or quantitative result. Plain English, no jargon stacking. Never start with "This is" or "It is".
   - If TEXT is empty or thin, infer from ORIGINAL_TITLE but stay accurate; do NOT fabricate numbers.

3. "categories" (string[]): subset of ["GenAI","CV","ML","DL","Agentic","Research","Products"]. Pick 1–3 that fit.

4. "relevanceScore" (number, 0..1): how useful for an AI/ML practitioner today.
   - 0.9–1.0: must-read (frontier model release, SOTA paper, major product launch)
   - 0.7–0.89: strong interest (notable open-source, useful tool, important benchmark)
   - 0.4–0.69: nice to know (incremental work, blog post, minor release)
   - <0.4: skip-worthy (PR fluff, marketing, off-topic)

Style examples:
- BAD headline: "New AI model launches today"
- GOOD headline: "Anthropic releases Claude 3.5 Haiku, beats GPT-4o-mini on HumanEval"
- BAD summary: "A new model was released. It is very fast and good for coding."
- GOOD summary: "Anthropic launched Claude 3.5 Haiku, a small low-latency model priced at $1/$5 per Mtok. It outperforms GPT-4o-mini on coding (88.1% HumanEval) and matches Sonnet on tool use while costing 60% less."

Return ONLY a JSON array of these objects, in the same order as the items. No markdown fences, no prose, no trailing commentary.

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
