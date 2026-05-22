import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

const full = {
  GEMINI_API_KEY: 'g', SUPABASE_URL: 'u', SUPABASE_SERVICE_KEY: 's',
  RESEND_API_KEY: 'r', RECIPIENT_EMAIL: 'me@x.com', WEB_APP_URL: 'https://x',
  ACCESS_TOKEN: 't', DATADOG_API_KEY: 'd',
};

describe('loadConfig', () => {
  it('returns a typed config when all vars are present', () => {
    const c = loadConfig(full);
    expect(c.geminiApiKey).toBe('g');
    expect(c.recipientEmail).toBe('me@x.com');
  });

  it('throws listing all missing required vars', () => {
    expect(() => loadConfig({ ...full, GEMINI_API_KEY: '', RESEND_API_KEY: '' }))
      .toThrow(/GEMINI_API_KEY.*RESEND_API_KEY|RESEND_API_KEY.*GEMINI_API_KEY/);
  });
});
