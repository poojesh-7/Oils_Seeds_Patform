-- Run this in Supabase SQL Editor

create table if not exists public.seeds_market_data (
  id bigint generated always as identity primary key,
  record_date date not null,
  commodity_name text not null,
  msp numeric(12,2),
  prices numeric(12,2),
  arrival_quantity numeric(12,2),
  data_hash text not null unique,
  raw_json jsonb not null,
  source text not null default 'agmarknet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_seeds_market_data_record_date
  on public.seeds_market_data(record_date desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_seeds_market_data_updated_at on public.seeds_market_data;
create trigger trg_seeds_market_data_updated_at
before update on public.seeds_market_data
for each row
execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.seeds_market_data to anon, authenticated;
grant usage, select on sequence public.seeds_market_data_id_seq to anon, authenticated;

alter table public.seeds_market_data enable row level security;

drop policy if exists "seeds_select_anon" on public.seeds_market_data;
create policy "seeds_select_anon"
on public.seeds_market_data
for select
to anon, authenticated
using (true);

drop policy if exists "seeds_insert_anon" on public.seeds_market_data;
create policy "seeds_insert_anon"
on public.seeds_market_data
for insert
to anon, authenticated
with check (true);

drop policy if exists "seeds_update_anon" on public.seeds_market_data;
create policy "seeds_update_anon"
on public.seeds_market_data
for update
to anon, authenticated
using (true)
with check (true);
