create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  status text not null check (status in ('received', 'enriching', 'forwarding', 'completed', 'failed')),
  received_at timestamptz not null default now(),
  payload jsonb not null,
  enrichment jsonb,
  forwarding jsonb,
  error jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists pipeline_runs_status_idx on pipeline_runs (status);

alter table pipeline_runs enable row level security;

-- Permissive anon-key policies: this table holds operational automation
-- data written only by this project's own backend (no browser client,
-- no end-user PII exposed to a public app) -- same anon-key-everywhere
-- pattern as rag-docs-support-agent, for the same reason (Supabase MCP
-- only ever hands out anon/publishable keys, never service_role).
create policy "Backend insert" on pipeline_runs for insert with check (true);
create policy "Backend select" on pipeline_runs for select using (true);
create policy "Backend update" on pipeline_runs for update using (true);
