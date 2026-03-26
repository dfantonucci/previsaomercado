-- Execute no SQL Editor do Supabase ou via CLI.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Permite insert anônimo apenas para novos emails (ajuste conforme sua política de segurança).
create policy "Allow public insert leads"
  on public.leads
  for insert
  to anon
  with check (true);
