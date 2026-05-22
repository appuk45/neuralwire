export interface Config {
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
  recipientEmail: string;
  webAppUrl: string;
  accessToken: string;
  datadogApiKey: string;
}

const REQUIRED: Record<keyof Config, string> = {
  geminiApiKey: 'GEMINI_API_KEY',
  supabaseUrl: 'SUPABASE_URL',
  supabaseServiceKey: 'SUPABASE_SERVICE_KEY',
  resendApiKey: 'RESEND_API_KEY',
  recipientEmail: 'RECIPIENT_EMAIL',
  webAppUrl: 'WEB_APP_URL',
  accessToken: 'ACCESS_TOKEN',
  datadogApiKey: 'DATADOG_API_KEY',
};

export function loadConfig(env: Record<string, string | undefined>): Config {
  const missing: string[] = [];
  const out = {} as Config;
  for (const [key, envName] of Object.entries(REQUIRED) as [keyof Config, string][]) {
    const val = env[envName];
    if (!val) missing.push(envName);
    else out[key] = val;
  }
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  return out;
}
