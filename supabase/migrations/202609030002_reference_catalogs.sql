create table public.stoppage_reasons (
  id uuid primary key default gen_random_uuid(),
  type public.stoppage_type not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (type, name)
);

create table public.material_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  unit text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.stoppage_reasons enable row level security;
alter table public.material_catalog enable row level security;
create policy reasons_read on public.stoppage_reasons for select to authenticated using (true);
create policy reasons_supervisor_write on public.stoppage_reasons for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
create policy materials_read on public.material_catalog for select to authenticated using (true);
create policy materials_supervisor_write on public.material_catalog for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());

insert into public.production_lines(name) values
  ('Blistera'), ('Inyectora'), ('Tableteadora'), ('Encapsuladora'), ('Mezcladora'), ('Llenadora'), ('Acondicionadora')
on conflict (name) do nothing;

insert into public.equipment(line_id, name, standard_speed)
select l.id, values_table.name, values_table.speed
from (values
  ('Blistera', 'Blistera B-01', 100),
  ('Inyectora', 'Inyectora I-01', 85),
  ('Tableteadora', 'Tableteadora T-01', 110),
  ('Encapsuladora', 'Encapsuladora E-01', 120),
  ('Mezcladora', 'Mezcladora M-01', 70),
  ('Llenadora', 'Llenadora L-02', 80),
  ('Acondicionadora', 'Acondicionadora A-01', 95)
) as values_table(line_name, name, speed)
join public.production_lines l on l.name = values_table.line_name
on conflict (name) do nothing;

insert into public.stoppage_reasons(type, name) values
  ('planned', 'Limpieza programada'),
  ('planned', 'Cambio de formatos'),
  ('planned', 'Mantenimiento preventivo'),
  ('planned', 'Otros'),
  ('unplanned', 'Corte de servicios'),
  ('unplanned', 'Avería mecánica'),
  ('unplanned', 'Avería eléctrica'),
  ('unplanned', 'Bloqueos'),
  ('unplanned', 'Falla no identificada (TNI)'),
  ('unplanned', 'Otros'),
  ('performance', 'Microparada de máquina'),
  ('performance', 'Microparada de línea'),
  ('performance', 'Atasco de material'),
  ('performance', 'Ajuste menor'),
  ('performance', 'Otros')
on conflict (type, name) do nothing;

insert into public.material_catalog(code, description, unit) values
  ('K1553', 'CAJA DE 20 X 20', 'Unidad'),
  ('K155', 'CAJA DE 50', 'Unidad'),
  ('ENV-001', 'Frasco PEAD', 'unidades'),
  ('ENV-002', 'Tapa rosca de seguridad', 'unidades'),
  ('ENV-003', 'Blíster PVC/Aluminio', 'unidades'),
  ('ACO-001', 'Caja plegadiza', 'unidades'),
  ('ACO-002', 'Inserto impreso', 'unidades'),
  ('ACO-003', 'Etiqueta autoadhesiva', 'unidades')
on conflict (code) do nothing;

