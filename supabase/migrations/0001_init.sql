create extension if not exists "pgcrypto";

create table if not exists articles (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,
  source_url      text not null,
  original_title  text not null,
  headline        text not null,
  summary         text not null,
  categories      text[] not null default '{}',
  relevance_score real not null default 0,
  published_at    timestamptz,
  fetched_at      timestamptz not null default now(),
  content_hash    text not null unique,
  in_digest       boolean not null default false,
  digest_date     date
);

create index if not exists idx_articles_published on articles (published_at desc);
create index if not exists idx_articles_digest on articles (digest_date);
create index if not exists idx_articles_categories on articles using gin (categories);

create table if not exists digest_runs (
  id                uuid primary key default gen_random_uuid(),
  run_date          date not null,
  articles_fetched  int not null default 0,
  articles_stored   int not null default 0,
  email_sent        boolean not null default false,
  status            text not null,
  error             text,
  per_source_stats  jsonb,
  created_at        timestamptz not null default now()
);
