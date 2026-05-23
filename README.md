# NeuralWire

Daily AI news, fetched, summarized, and dropped in your inbox at 7am IST.

[![Daily AI Digest](https://github.com/appuk45/neuralwire/actions/workflows/digest.yml/badge.svg)](https://github.com/appuk45/neuralwire/actions/workflows/digest.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-green)

## What it is

Pulls the last 24 hours of AI/ML news from arxiv, official AI lab blogs, tech news sites, Reddit, HuggingFace, and GitHub trending. Gemini rewrites each item into a short headline plus a two-sentence summary. The top 10 go in an email; everything else gets stored for a web feed (not yet built).

I built it because RSS readers buried me in noise and Twitter is no longer usable for keeping up.

## How it works

```
              GitHub Actions cron (7am IST)
                          |
                          v
          +---------------+----------------+
          |                                |
     fetch sources                  Gemini 3.5 Flash
     (failure-isolated,             rewrites headline
      per-URL try/catch)            + summary + categories
          |                                ^
          v                                |
     normalize -> dedup -> keyword filter -+
          |
          v
     Supabase (articles, digest_runs)
          |
          v
     top 10 -> Resend -> inbox
          |
          v
     Datadog (logs from every stage)
```

A failed source never blocks the pipeline. A bad RSS feed inside a source never blocks the other feeds in that source. A Gemini hiccup falls back to the raw title and a `relevanceScore` of 0.3.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node 22, TypeScript, ESM |
| Tests | Vitest |
| DB | Supabase Postgres |
| LLM | Gemini 3.5 Flash via `@google/genai` |
| Email | Resend (verified domain: neuralwire.app) |
| Logs | Datadog US5 |
| Cron | GitHub Actions |
| Web app (Plan 2) | Next.js on Cloudflare Pages |

GitHub Actions runs the cron because Cloudflare Workers' free tier caps CPU per request at 10ms, which is way too tight for hitting six sources and waiting on Gemini. Supabase won over MongoDB even though MongoDB is in the Student Pack, because the web app will want relational queries and OAuth later. Supabase's free tier idles after 7 days without activity, but a daily write from the cron is enough to keep it warm. Gemini Flash gets the LLM job because the free tier is generous and the quality holds up for short summaries; the alternatives would cost real money at zero noticeable benefit. Resend handles email because SES would be cheaper but the setup is rough, and Resend's UX is much better for personal use.

## Setup

You need accounts on Supabase, Resend, Google AI Studio, Datadog, GitHub.

1. Clone the repo and install: `nvm use && npm install`.
2. In Supabase, run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Grant table access to the `service_role`:
   ```sql
   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
   ```
4. Copy the eight API keys/values listed below into GitHub repo Settings > Secrets and variables > Actions.
5. From the Actions tab, run the "Daily AI Digest" workflow manually.

Email should arrive within ~30 seconds of the workflow turning green.

### Required secrets

| Name | Where to get it |
|---|---|
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `SUPABASE_URL` | Supabase project Settings > API |
| `SUPABASE_SERVICE_KEY` | Same page, "Legacy anon, service_role API keys" tab, `service_role` secret |
| `RESEND_API_KEY` | resend.com > API Keys |
| `RECIPIENT_EMAIL` | Your email |
| `WEB_APP_URL` | `https://neuralwire.app` (or wherever Plan 2 ends up) |
| `ACCESS_TOKEN` | Run `openssl rand -hex 32`; gates the web app |
| `DATADOG_API_KEY` | app.us5.datadoghq.com > Organization Settings > API Keys |

If your Datadog account is in a region other than US5, edit the intake URL in `scripts/cron/src/monitoring.ts`.

## Local development

```bash
cd scripts/cron
cp .env.example .env   # fill in your own keys
npm test               # vitest, all 40 tests
npm run typecheck      # tsc --noEmit
npm start              # runs the pipeline once with your .env values
```

Unit tests cover the pure logic (normalize, dedup, filter, ranking, prompt building, email rendering, retry, source registry). They do not hit the network. To test against real Supabase/Resend/Gemini/Datadog, use `npm start` with a real `.env`.

## Schedule

`30 1 * * *` UTC = 07:00 IST, set in `.github/workflows/digest.yml`. Trigger manually from the Actions tab any time.

## Repo layout

```
neuralwire/
├── .github/workflows/digest.yml     # cron + manual dispatch
├── apps/web/                         # Plan 2 web app (stub for now)
├── scripts/cron/
│   ├── src/
│   │   ├── sources/                  # arxiv, blogs, technews, reddit, hf, github + registry
│   │   ├── pipeline/                 # normalize, dedup, filter, summarize, rank
│   │   ├── email/digest.ts           # HTML render + Resend send
│   │   ├── util/retry.ts             # exponential backoff for API calls
│   │   ├── db.ts                     # Supabase client + row mapping
│   │   ├── monitoring.ts             # Datadog log shipping
│   │   ├── config.ts                 # env loader
│   │   ├── log.ts                    # structured logger
│   │   └── index.ts                  # orchestrator + main()
│   └── tests/                        # mirrors src/, vitest
├── supabase/migrations/              # SQL schema
└── package.json                      # npm workspaces root
```

## Roadmap

Plan 2 is the web app: Next.js on Cloudflare Pages, an Inshorts-style card feed, category filter, archive view, gated by the `ACCESS_TOKEN` env var until OAuth is in.

After that, in rough order:

- OAuth via Clerk (Student Pack has it free) so the access-token gate can go away.
- Multi-user support so other people can subscribe with their own preferences.
- Twitter/X back in, if a viable API path opens up. The free tier was killed in 2023.
- Article retention policy. Right now it stores everything forever; eventually that needs cleanup.

## License

MIT. See [LICENSE](LICENSE).
