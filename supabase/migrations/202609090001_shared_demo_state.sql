create table if not exists public.bioee_shared_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bioee_shared_state enable row level security;

drop policy if exists shared_state_read on public.bioee_shared_state;
drop policy if exists shared_state_insert on public.bioee_shared_state;
drop policy if exists shared_state_update on public.bioee_shared_state;

create policy shared_state_read on public.bioee_shared_state
  for select to anon, authenticated using (id = 'main');
create policy shared_state_insert on public.bioee_shared_state
  for insert to anon, authenticated with check (id = 'main');
create policy shared_state_update on public.bioee_shared_state
  for update to anon, authenticated using (id = 'main') with check (id = 'main');

grant select, insert, update on public.bioee_shared_state to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bioee_shared_state'
  ) then
    alter publication supabase_realtime add table public.bioee_shared_state;
  end if;
end $$;
