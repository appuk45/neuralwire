import type { LogLine } from './log.js';

export async function shipLogs(lines: LogLine[], apiKey: string): Promise<void> {
  if (lines.length === 0) return;
  const payload = lines.map((l) => ({
    ddsource: 'neuralwire-cron',
    service: 'neuralwire-digest',
    message: JSON.stringify(l),
    status: l.level,
  }));
  await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'DD-API-KEY': apiKey },
    body: JSON.stringify(payload),
  });
}
