import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubSource } from '../../src/sources/github.js';

const sample = {
  items: [
    {
      full_name: 'acme/llm-toolkit',
      html_url: 'https://github.com/acme/llm-toolkit',
      description: 'A toolkit for LLMs',
      pushed_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      stargazers_count: 1200,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify(sample), { headers: { 'content-type': 'application/json' } })));
});

describe('githubSource', () => {
  it('maps trending repos to RawArticle', async () => {
    const items = await githubSource();
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('github');
    expect(items[0].sourceUrl).toBe('https://github.com/acme/llm-toolkit');
    expect(items[0].title).toContain('llm-toolkit');
    expect(items[0].rawText).toContain('toolkit for LLMs');
  });
});
