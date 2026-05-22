type Level = 'info' | 'warn' | 'error';
export interface LogLine { ts: string; level: Level; msg: string; [k: string]: unknown; }

export interface Logger {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  lines(): LogLine[];
}

export function createLogger(): Logger {
  const collected: LogLine[] = [];
  const emit = (level: Level, msg: string, ctx?: Record<string, unknown>) => {
    const line: LogLine = { ts: new Date().toISOString(), level, msg, ...ctx };
    collected.push(line);
    console.log(JSON.stringify(line));
  };
  return {
    info: (m, c) => emit('info', m, c),
    warn: (m, c) => emit('warn', m, c),
    error: (m, c) => emit('error', m, c),
    lines: () => collected,
  };
}
