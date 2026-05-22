import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from '../src/log.js';

afterEach(() => vi.restoreAllMocks());

describe('createLogger', () => {
  it('emits JSON lines with level, msg, and context', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger();
    log.info('hello', { source: 'arxiv' });
    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line.level).toBe('info');
    expect(line.msg).toBe('hello');
    expect(line.source).toBe('arxiv');
    expect(typeof line.ts).toBe('string');
  });

  it('collects emitted lines for later shipping', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger();
    log.info('a');
    log.error('b');
    expect(log.lines()).toHaveLength(2);
    expect(log.lines()[1].level).toBe('error');
  });
});
