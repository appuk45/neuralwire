import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../../src/util/fetchWithTimeout.js';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fetchWithTimeout', () => {
  it('returns response when fetch resolves before timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response('ok', { status: 200 })));
    const res = await fetchWithTimeout('https://x', {}, 1000);
    expect(res.status).toBe(200);
  });

  it('throws timeout error when fetch stalls past timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })));
    const promise = fetchWithTimeout('https://slow', {}, 500);
    vi.advanceTimersByTime(600);
    await expect(promise).rejects.toThrow(/fetch timeout after 500ms/);
  });

  it('passes through non-abort fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNRESET');
    }));
    await expect(fetchWithTimeout('https://x', {}, 1000)).rejects.toThrow(/ECONNRESET/);
  });

  it('merges signal when caller provides their own', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      return new Response('ok');
    }));
    const callerCtrl = new AbortController();
    await fetchWithTimeout('https://x', { signal: callerCtrl.signal }, 1000);
  });
});
