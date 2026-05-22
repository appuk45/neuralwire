import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shipLogs } from '../src/monitoring.js';
import type { LogLine } from '../src/log.js';

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{}', { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
});

const lines: LogLine[] = [{ ts: 't', level: 'info', msg: 'hi' }];

describe('shipLogs', () => {
  it('POSTs logs to Datadog with the API key header', async () => {
    await shipLogs(lines, 'dd-key');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('datadoghq.com');
    expect((init as RequestInit).headers).toMatchObject({ 'DD-API-KEY': 'dd-key' });
  });

  it('does nothing when there are no lines', async () => {
    await shipLogs([], 'dd-key');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
