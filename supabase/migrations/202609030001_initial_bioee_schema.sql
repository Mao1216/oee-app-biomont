create extension if not exists pgcrypto;

create type public.app_role as enum ('supervisor', 'operator');
create type public.work_order_status as enum ('not_started', 'in_progress', 'review', 'observed', 'approved');
create type public.session_status as enum ('draft', 'in_progress', 'review', 'observed', 'approved');
create type public.stoppage_type as enum ('planned', 'unplanned', 'performance');
create type public.discard_type as enum ('packaging', 'conditioning');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'operator',
  employee_code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.production_lines(id),
  name text not null unique,
  standard_speed numeric(12,4) not null default 0 check (standard_speed >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.operator_lines (
  operator_id uuid not null references public.profiles(id) on delete cascade,
  line_id uuid not null references public.production_lines(id) on delete cascade,
  primary key (operator_id, line_id)
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  product_code text,
  product_name text not null,
  created_at timestamptz not null default now()
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  lot_id uuid not null references public.lots(id),
  equipment_id uuid not null references public.equipment(id),
  planned_quantity numeric(14,3) not null check (planned_quantity >= 0),
  standard_speed numeric(12,4) not null check (standard_speed >= 0),
  status public.work_order_status not null default 'not_started',
  registrar_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.oee_sessions (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  registrar_id uuid not null references public.profiles(id),
  process_start timestamptz,
  process_end timestamptz,
  status public.session_status not null default 'draft',
  supervisor_observation text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id)
);

create table public.stoppages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.oee_sessions(id) on delete cascade,
  type public.stoppage_type not null,
  cause text not null,
  comment text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes numeric(10,2) not null default 0 check (duration_minutes >= 0),
  is_tni boolean generated always as (type = 'unplanned' and lower(cause) like '%falla no identificada%') stored,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.oee_sessions(id) on delete cascade,
  good_quantity numeric(14,3) not null default 0 check (good_quantity >= 0),
  reprocess_quantity numeric(14,3) not null default 0 check (reprocess_quantity >= 0),
  waste_quantity numeric(14,3) not null default 0 check (waste_quantity >= 0),
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.overweight_samples (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.oee_sessions(id) on delete cascade,
  sampled_at timestamptz not null,
  target_weight numeric(12,4) not null check (target_weight > 0),
  sample_size integer not null check (sample_size > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.overweight_measurements (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references public.overweight_samples(id) on delete cascade,
  measurement_number integer not null check (measurement_number > 0),
  weight numeric(12,4) not null check (weight > 0),
  unique (sample_id, measurement_number)
);

create table public.material_discards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.oee_sessions(id) on delete cascade,
  type public.discard_type not null,
  reason text not null,
  material_code text not null,
  material_description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.support_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.oee_sessions(id) on delete cascade,
  stoppage_id uuid references public.stoppages(id) on delete cascade,
  operator_id uuid references public.profiles(id),
  external_name text,
  hours numeric(8,2) not null check (hours > 0),
  created_at timestamptz not null default now(),
  check (operator_id is not null or nullif(trim(external_name), '') is not null)
);

create table public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  stoppage_id uuid not null unique references public.stoppages(id) on delete cascade,
  code text not null unique,
  priority text not null,
  detail text,
  reported_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null,
  actor_id uuid references public.profiles(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger work_orders_touch before update on public.work_orders for each row execute function public.touch_updated_at();
create trigger sessions_touch before update on public.oee_sessions for each row execute function public.touch_updated_at();
create trigger stoppages_touch before update on public.stoppages for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Usuario'), 'operator');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_supervisor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'supervisor' and active);
$$;

create or replace function public.can_access_line(p_line_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_supervisor() or exists(
    select 1 from public.operator_lines where operator_id = auth.uid() and line_id = p_line_id
  );
$$;

create or replace function public.can_edit_session(p_session_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.oee_sessions s
    where s.id = p_session_id and s.status in ('draft', 'in_progress', 'observed')
      and (s.registrar_id = auth.uid() or public.is_supervisor())
  );
$$;

create or replace function public.start_oee_session(p_work_order_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_session_id uuid; v_line_id uuid;
begin
  select e.line_id into v_line_id from public.work_orders w join public.equipment e on e.id = w.equipment_id where w.id = p_work_order_id;
  if v_line_id is null or not public.can_access_line(v_line_id) then raise exception 'No autorizado para esta línea'; end if;
  insert into public.oee_sessions(work_order_id, registrar_id, status)
  values (p_work_order_id, auth.uid(), 'in_progress')
  on conflict (work_order_id) do update set registrar_id = coalesce(public.oee_sessions.registrar_id, auth.uid())
  returning id into v_session_id;
  update public.work_orders set registrar_id = auth.uid(), status = 'in_progress' where id = p_work_order_id and status = 'not_started';
  return v_session_id;
end $$;

alter table public.profiles enable row level security;
alter table public.production_lines enable row level security;
alter table public.equipment enable row level security;
alter table public.operator_lines enable row level security;
alter table public.lots enable row level security;
alter table public.work_orders enable row level security;
alter table public.oee_sessions enable row level security;
alter table public.stoppages enable row level security;
alter table public.production_records enable row level security;
alter table public.overweight_samples enable row level security;
alter table public.overweight_measurements enable row level security;
alter table public.material_discards enable row level security;
alter table public.support_assignments enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_supervisor());
create policy profiles_supervisor_write on public.profiles for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy lines_read on public.production_lines for select to authenticated using (public.can_access_line(id));
create policy lines_supervisor_write on public.production_lines for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy equipment_read on public.equipment for select to authenticated using (public.can_access_line(line_id));
create policy equipment_supervisor_write on public.equipment for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy operator_lines_read on public.operator_lines for select to authenticated using (operator_id = auth.uid() or public.is_supervisor());
create policy operator_lines_supervisor_write on public.operator_lines for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy lots_read on public.lots for select to authenticated using (true);
create policy lots_supervisor_write on public.lots for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy work_orders_read on public.work_orders for select to authenticated using (public.is_supervisor() or exists(select 1 from public.equipment e where e.id = equipment_id and public.can_access_line(e.line_id)));
create policy work_orders_supervisor_write on public.work_orders for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy sessions_read on public.oee_sessions for select to authenticated using (registrar_id = auth.uid() or public.is_supervisor());
create policy sessions_insert on public.oee_sessions for insert to authenticated with check (registrar_id = auth.uid());
create policy sessions_update on public.oee_sessions for update to authenticated using (public.can_edit_session(id)) with check (public.can_edit_session(id));

create policy stoppages_read on public.stoppages for select to authenticated using (exists(select 1 from public.oee_sessions s where s.id = session_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy stoppages_write on public.stoppages for all to authenticated using (public.can_edit_session(session_id)) with check (public.can_edit_session(session_id) and created_by = auth.uid());
create policy production_read on public.production_records for select to authenticated using (exists(select 1 from public.oee_sessions s where s.id = session_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy production_write on public.production_records for all to authenticated using (public.can_edit_session(session_id)) with check (public.can_edit_session(session_id) and created_by = auth.uid());
create policy samples_read on public.overweight_samples for select to authenticated using (exists(select 1 from public.oee_sessions s where s.id = session_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy samples_write on public.overweight_samples for all to authenticated using (public.can_edit_session(session_id)) with check (public.can_edit_session(session_id) and created_by = auth.uid());
create policy measurements_read on public.overweight_measurements for select to authenticated using (exists(select 1 from public.overweight_samples os join public.oee_sessions s on s.id = os.session_id where os.id = sample_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy measurements_write on public.overweight_measurements for all to authenticated using (exists(select 1 from public.overweight_samples os where os.id = sample_id and public.can_edit_session(os.session_id))) with check (exists(select 1 from public.overweight_samples os where os.id = sample_id and public.can_edit_session(os.session_id)));
create policy discards_read on public.material_discards for select to authenticated using (exists(select 1 from public.oee_sessions s where s.id = session_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy discards_write on public.material_discards for all to authenticated using (public.can_edit_session(session_id)) with check (public.can_edit_session(session_id) and created_by = auth.uid());
create policy support_read on public.support_assignments for select to authenticated using (exists(select 1 from public.oee_sessions s where s.id = session_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy support_write on public.support_assignments for all to authenticated using (public.can_edit_session(session_id)) with check (public.can_edit_session(session_id));
create policy tickets_read on public.maintenance_tickets for select to authenticated using (exists(select 1 from public.stoppages st join public.oee_sessions s on s.id = st.session_id where st.id = stoppage_id and (s.registrar_id = auth.uid() or public.is_supervisor())));
create policy tickets_write on public.maintenance_tickets for all to authenticated using (exists(select 1 from public.stoppages st where st.id = stoppage_id and public.can_edit_session(st.session_id))) with check (reported_by = auth.uid());
create policy audit_supervisor_read on public.audit_log for select to authenticated using (public.is_supervisor());

alter publication supabase_realtime add table public.work_orders, public.oee_sessions, public.stoppages, public.production_records, public.overweight_samples, public.material_discards, public.maintenance_tickets;

