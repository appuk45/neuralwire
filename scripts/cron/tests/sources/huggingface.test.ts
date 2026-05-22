import { describe, it, expect, vi, beforeEach } from 'vitest';
import { huggingfaceSource } from '../../src/sources/huggingface.js';

const recent = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
const sample = [
  {
    paper: { id: '2401.00001', title: 'Efficient Attention', publishedAt: recent },
  },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify(sample), { headers: { 'content-type': 'application/json' } })));
});

describe('huggingfaceSource', () => {
  it('maps HF daily papers to RawArticle with hf.co/papers URL', async () => {
    const items = await huggingfaceSource();
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('huggingface');
    expect(items[0].sourceUrl).toBe('https://huggingface.co/papers/2401.00001');
    expect(items[0].title).toBe('Efficient Attention');
  });
});
