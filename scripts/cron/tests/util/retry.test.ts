import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/util/retry.js';

describe('withRetry', () => {
  it('returns first call result without retry on success', async () => {
    const fn = vi.fn(async () => 'ok');
    const out = await withRetry(fn);
    expect(out).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries on 429 then succeeds', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw { status: 429, message: 'rate limit' };
      return 'ok';
    });
    const out = await withRetry(fn, { baseDelayMs: 1 });
    expect(out).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx then succeeds', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) throw { status: 503, message: 'service unavailable' };
      return 'ok';
    };
    const out = await withRetry(fn, { baseDelayMs: 1 });
    expect(out).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does NOT retry on 4xx (non-429)', async () => {
    const fn = vi.fn(async () => { throw { status: 400, message: 'bad request' }; });
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries on network errors with no status code', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 2) throw new Error('ECONNRESET');
      return 'ok';
    };
    const out = await withRetry(fn, { baseDelayMs: 1 });
    expect(out).toBe('ok');
    expect(calls).toBe(2);
  });

  it('throws last error after maxAttempts', async () => {
    const fn = vi.fn(async () => { throw { status: 500, message: 'boom' }; });
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toMatchObject({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('invokes onRetry callback before each retry', async () => {
    let calls = 0;
    const onRetry = vi.fn();
    const fn = async () => {
      calls++;
      if (calls < 2) throw { status: 429 };
      return 'ok';
    };
    await withRetry(fn, { baseDelayMs: 1, onRetry });
    expect(onRetry).toHaveBeenCalledOnce();
    const [attempt, , delay] = onRetry.mock.calls[0];
    expect(attempt).toBe(1);
    expect(delay).toBe(1);
  });
});
