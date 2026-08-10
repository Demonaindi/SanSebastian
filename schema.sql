-- San Sebastián Transporte — Schema Supabase / PostgreSQL
-- Ejecutar en el SQL Editor de Supabase (proyecto nuevo o vacío).
-- Si el proyecto ya existe, ejecutá también la sección "MIGRAÇÃO incremental" al final.

create extension if not exists "pgcrypto";

-- ─── Perfiles y roles (Supabase Auth) ───────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'Operador'
    check (rol in ('Administrador', 'Operador')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'rol', 'Operador')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Tablas de negocio ───────────────────────────────────────────────────────

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre_razon_social text not null,
  cuil_cuit_dni text,
  telefono text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.choferes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  licencia_categoria text not null default 'D1',
  dni text,
  carnet_conducir_vencimiento date,
  libreta_trabajo_vencimiento date,
  estado text not null default 'Disponible'
    check (estado in ('Disponible', 'En viaje', 'Franco', 'Licencia')),
  created_at timestamptz not null default now()
);

create table if not exists public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null
    check (categoria in ('Combi', '1 piso', '2 pisos')),
  capacidad integer not null check (capacidad > 0),
  tarifa_km numeric(12, 2) not null check (tarifa_km >= 0),
  estado text not null default 'Disponible'
    check (estado in ('Disponible', 'En viaje')),
  color text not null default '#3b82f6',
  vtv_vencimiento date,
  seguro_vencimiento date,
  matafuegos_vencimiento date,
  kilometraje integer not null default 0 check (kilometraje >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.viajes (
  id uuid primary key default gen_random_uuid(),
  origen text not null,
  destino text not null,
  pasajeros integer not null check (pasajeros > 0),
  fecha_viaje date not null,
  fecha_hasta date,
  hora_viaje time,
  hora_regreso time,
  hora_llegada_aprox time,
  distancia_km numeric(10, 2) not null default 0 check (distancia_km >= 0),
  precio_base_calculado numeric(14, 2),
  precio_total numeric(14, 2) not null check (precio_total >= 0),
  valor_km numeric(12, 2),
  precio_base numeric(14, 2),
  adicionales jsonb not null default '[]'::jsonb,
  paradas_intermedias text,
  estado_pago text not null default 'Pendiente'
    check (estado_pago in ('Pendiente', 'Señado', 'Pagado')),
  monto_sena numeric(14, 2) not null default 0 check (monto_sena >= 0),
  estado_viaje text not null default 'Reservado'
    check (estado_viaje in ('Reservado', 'Confirmado', 'Cancelado', 'Reprogramado', 'Finalizado')),
  cliente_id uuid references public.clientes (id) on delete set null,
  chofer_id uuid references public.choferes (id) on delete set null,
  vehiculo_id uuid references public.vehiculos (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint viajes_rango_fechas check (fecha_hasta is null or fecha_hasta >= fecha_viaje)
);

create table if not exists public.caja_diaria (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('Ingreso', 'Egreso')),
  concepto text not null,
  monto numeric(14, 2) not null check (monto > 0),
  viaje_id uuid references public.viajes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  origen text not null,
  destino text not null,
  pasajeros integer not null,
  fecha_viaje date,
  hora_viaje time,
  distancia_km numeric(10, 2) not null default 0,
  vehiculo_nombre text,
  vehiculo_categoria text,
  precio_total numeric(14, 2) not null,
  valor_km numeric(12, 2),
  precio_base numeric(14, 2),
  adicionales jsonb not null default '[]'::jsonb,
  dias_validez integer not null default 7,
  condiciones_pago text not null default 'Seña del 50% para confirmar. Saldo restante 48 hs antes del viaje. Cancelaciones con menos de 72 hs: seña no reembolsable.',
  paradas_intermedias text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create sequence if not exists public.presupuesto_numero_seq start 1;

create index if not exists idx_viajes_fecha on public.viajes (fecha_viaje);
create index if not exists idx_viajes_fecha_hasta on public.viajes (fecha_hasta);
create index if not exists idx_viajes_vehiculo on public.viajes (vehiculo_id);
create index if not exists idx_viajes_estado_pago on public.viajes (estado_pago);
create index if not exists idx_viajes_estado_viaje on public.viajes (estado_viaje);
create index if not exists idx_vehiculos_estado on public.vehiculos (estado);
create index if not exists idx_choferes_estado on public.choferes (estado);
create index if not exists idx_caja_created on public.caja_diaria (created_at desc);
create index if not exists idx_presupuestos_numero on public.presupuestos (numero);

-- ─── Helpers agenda ──────────────────────────────────────────────────────────

create or replace function public.viaje_rango_fin(p_fecha_viaje date, p_fecha_hasta date)
returns date
language sql
immutable
as $$
  select coalesce(p_fecha_hasta, p_fecha_viaje);
$$;

create or replace function public.vehiculo_disponible_en_rango(
  p_vehiculo_id uuid,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_exclude_viaje_id uuid default null,
  p_hora_desde time default null,
  p_hora_hasta time default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fin date := coalesce(p_fecha_hasta, p_fecha_desde);
  v_new_start timestamp;
  v_new_end timestamp;
  v_conflicto integer;
begin
  v_new_start := (p_fecha_desde + coalesce(p_hora_desde, time '00:00'))::timestamp;
  v_new_end := (v_fin + coalesce(p_hora_hasta, p_hora_desde, time '23:59:59'))::timestamp;
  if v_new_end <= v_new_start then
    v_new_end := v_new_start + interval '1 hour';
  end if;

  select count(*) into v_conflicto
  from viajes v
  where v.vehiculo_id = p_vehiculo_id
    and coalesce(v.estado_viaje, 'Reservado') not in ('Cancelado', 'Finalizado')
    and (p_exclude_viaje_id is null or v.id <> p_exclude_viaje_id)
    and (
      (v.fecha_viaje + coalesce(v.hora_viaje, time '00:00'))::timestamp
      < v_new_end
    )
    and (
      (
        public.viaje_rango_fin(v.fecha_viaje, v.fecha_hasta)
        + coalesce(v.hora_regreso, v.hora_llegada_aprox, v.hora_viaje, time '23:59:59')
      )::timestamp
      > v_new_start
    );

  return v_conflicto = 0;
end;
$$;

-- ─── RPC: confirmar / reservar viaje ─────────────────────────────────────────
-- No bloquea por documentación vencida (VTV/seguro/matafuegos).
-- Valida solapamiento de unidad en el rango de fechas.
-- Chofer es opcional (puede asignarse después).

create or replace function public.confirmar_viaje(
  p_origen text,
  p_destino text,
  p_pasajeros integer,
  p_fecha_viaje date,
  p_hora_viaje time,
  p_distancia_km numeric,
  p_precio_total numeric,
  p_cliente_id uuid,
  p_chofer_id uuid,
  p_vehiculo_id uuid,
  p_fecha_hasta date default null,
  p_hora_regreso time default null,
  p_hora_llegada_aprox time default null,
  p_paradas_intermedias text default null,
  p_precio_base_calculado numeric default null,
  p_estado_pago text default 'Pendiente'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viaje_id uuid;
  v_fecha_hasta date := coalesce(p_fecha_hasta, p_fecha_viaje);
begin
  if p_fecha_viaje is null then
    raise exception 'La fecha de viaje es obligatoria';
  end if;

  if not exists (select 1 from vehiculos where id = p_vehiculo_id) then
    raise exception 'Vehículo no encontrado';
  end if;

  if not public.vehiculo_disponible_en_rango(
    p_vehiculo_id,
    p_fecha_viaje,
    v_fecha_hasta,
    null,
    p_hora_viaje,
    coalesce(p_hora_regreso, p_hora_llegada_aprox, p_hora_viaje)
  ) then
    raise exception 'La unidad ya tiene una reserva que se solapa en ese horario';
  end if;

  if p_chofer_id is not null and not exists (select 1 from choferes where id = p_chofer_id) then
    raise exception 'Chofer no encontrado';
  end if;

  insert into viajes (
    origen, destino, pasajeros,
    fecha_viaje, fecha_hasta, hora_viaje, hora_regreso, hora_llegada_aprox,
    distancia_km, precio_base_calculado, precio_total, paradas_intermedias,
    estado_pago, estado_viaje,
    cliente_id, chofer_id, vehiculo_id
  ) values (
    p_origen, p_destino, p_pasajeros,
    p_fecha_viaje, v_fecha_hasta, p_hora_viaje, p_hora_regreso, p_hora_llegada_aprox,
    coalesce(p_distancia_km, 0), p_precio_base_calculado, p_precio_total, p_paradas_intermedias,
    coalesce(p_estado_pago, 'Pendiente'), 'Reservado',
    p_cliente_id, p_chofer_id, p_vehiculo_id
  )
  returning id into v_viaje_id;

  return v_viaje_id;
end;
$$;

create or replace function public.reprogramar_viaje(
  p_viaje_id uuid,
  p_fecha_viaje date,
  p_fecha_hasta date default null,
  p_hora_viaje time default null,
  p_hora_regreso time default null,
  p_vehiculo_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viaje viajes%rowtype;
  v_vehiculo uuid;
  v_hasta date;
  v_hora_viaje time;
  v_hora_regreso time;
begin
  select * into v_viaje from viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'Viaje no encontrado';
  end if;

  v_vehiculo := coalesce(p_vehiculo_id, v_viaje.vehiculo_id);
  v_hasta := coalesce(p_fecha_hasta, p_fecha_viaje);
  v_hora_viaje := coalesce(p_hora_viaje, v_viaje.hora_viaje);
  v_hora_regreso := coalesce(p_hora_regreso, v_viaje.hora_regreso);

  if v_vehiculo is null then
    raise exception 'El viaje no tiene unidad asignada';
  end if;

  if not public.vehiculo_disponible_en_rango(
    v_vehiculo,
    p_fecha_viaje,
    v_hasta,
    p_viaje_id,
    v_hora_viaje,
    coalesce(v_hora_regreso, v_viaje.hora_llegada_aprox, v_hora_viaje)
  ) then
    raise exception 'La unidad no está disponible en ese horario';
  end if;

  update viajes set
    fecha_viaje = p_fecha_viaje,
    fecha_hasta = v_hasta,
    hora_viaje = v_hora_viaje,
    hora_regreso = v_hora_regreso,
    vehiculo_id = v_vehiculo,
    estado_viaje = 'Reprogramado'
  where id = p_viaje_id;

  return p_viaje_id;
end;
$$;

create or replace function public.cancelar_viaje(p_viaje_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update viajes set estado_viaje = 'Cancelado' where id = p_viaje_id;
  if not found then
    raise exception 'Viaje no encontrado';
  end if;
end;
$$;

create or replace function public.generar_presupuesto(
  p_origen text,
  p_destino text,
  p_pasajeros integer,
  p_fecha_viaje date,
  p_hora_viaje time,
  p_distancia_km numeric,
  p_vehiculo_nombre text,
  p_vehiculo_categoria text,
  p_precio_total numeric,
  p_dias_validez integer default 7,
  p_paradas_intermedias text default null
)
returns public.presupuestos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.presupuestos;
  v_numero integer;
begin
  v_numero := nextval('public.presupuesto_numero_seq');

  insert into presupuestos (
    numero, origen, destino, pasajeros, fecha_viaje, hora_viaje,
    distancia_km, vehiculo_nombre, vehiculo_categoria, precio_total,
    dias_validez, paradas_intermedias, created_by
  ) values (
    v_numero, p_origen, p_destino, p_pasajeros, p_fecha_viaje, p_hora_viaje,
    coalesce(p_distancia_km, 0), p_vehiculo_nombre, p_vehiculo_categoria, p_precio_total,
    coalesce(p_dias_validez, 7), p_paradas_intermedias, auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.eliminar_cuenta_propia()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.eliminar_cuenta_propia() to authenticated;
grant execute on function public.confirmar_viaje to authenticated;
grant execute on function public.reprogramar_viaje to authenticated;
grant execute on function public.cancelar_viaje to authenticated;
grant execute on function public.generar_presupuesto to authenticated;
grant execute on function public.vehiculo_disponible_en_rango to authenticated;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.choferes enable row level security;
alter table public.vehiculos enable row level security;
alter table public.viajes enable row level security;
alter table public.caja_diaria enable row level security;
alter table public.presupuestos enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and rol = 'Administrador'
  );
$$;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin());

-- Clientes: lectura todos; alta/edición autenticados; baja solo admin
drop policy if exists "clientes_select" on public.clientes;
drop policy if exists "clientes_insert" on public.clientes;
drop policy if exists "clientes_update" on public.clientes;
drop policy if exists "clientes_delete" on public.clientes;
create policy "clientes_select" on public.clientes for select to authenticated using (true);
create policy "clientes_insert" on public.clientes for insert to authenticated with check (public.is_admin());
create policy "clientes_update" on public.clientes for update to authenticated using (public.is_admin());
create policy "clientes_delete" on public.clientes for delete to authenticated using (public.is_admin());

drop policy if exists "choferes_select" on public.choferes;
drop policy if exists "choferes_insert" on public.choferes;
drop policy if exists "choferes_update" on public.choferes;
drop policy if exists "choferes_delete" on public.choferes;
create policy "choferes_select" on public.choferes for select to authenticated using (true);
create policy "choferes_insert" on public.choferes for insert to authenticated with check (public.is_admin());
create policy "choferes_update" on public.choferes for update to authenticated using (public.is_admin());
create policy "choferes_delete" on public.choferes for delete to authenticated using (public.is_admin());

drop policy if exists "vehiculos_select" on public.vehiculos;
drop policy if exists "vehiculos_insert" on public.vehiculos;
drop policy if exists "vehiculos_update" on public.vehiculos;
drop policy if exists "vehiculos_delete" on public.vehiculos;
create policy "vehiculos_select" on public.vehiculos for select to authenticated using (true);
create policy "vehiculos_insert" on public.vehiculos for insert to authenticated with check (public.is_admin());
create policy "vehiculos_update" on public.vehiculos for update to authenticated using (public.is_admin());
create policy "vehiculos_delete" on public.vehiculos for delete to authenticated using (public.is_admin());

-- Viajes: operador puede leer (agenda); crear/editar solo admin
drop policy if exists "viajes_select" on public.viajes;
drop policy if exists "viajes_insert" on public.viajes;
drop policy if exists "viajes_update" on public.viajes;
create policy "viajes_select" on public.viajes for select to authenticated using (true);
create policy "viajes_insert" on public.viajes for insert to authenticated with check (public.is_admin());
create policy "viajes_update" on public.viajes for update to authenticated using (public.is_admin());

drop policy if exists "caja_select" on public.caja_diaria;
drop policy if exists "caja_insert" on public.caja_diaria;
drop policy if exists "caja_delete" on public.caja_diaria;
create policy "caja_select" on public.caja_diaria for select to authenticated using (true);
create policy "caja_insert" on public.caja_diaria for insert to authenticated with check (public.is_admin());
create policy "caja_delete" on public.caja_diaria for delete to authenticated using (public.is_admin());

drop policy if exists "presupuestos_select" on public.presupuestos;
drop policy if exists "presupuestos_insert" on public.presupuestos;
create policy "presupuestos_select" on public.presupuestos for select to authenticated using (true);
create policy "presupuestos_insert" on public.presupuestos for insert to authenticated with check (true);

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant usage, select on sequence public.presupuesto_numero_seq to authenticated;
grant execute on function public.is_admin to authenticated;

-- ─── Datos iniciales ─────────────────────────────────────────────────────────

insert into public.vehiculos (nombre, categoria, capacidad, tarifa_km, estado, color, vtv_vencimiento, seguro_vencimiento, matafuegos_vencimiento, kilometraje)
values
  ('Renault Trafic', 'Combi', 19, 1050.00, 'Disponible', '#0ea5e9', current_date + interval '45 days', current_date + interval '20 days', current_date + interval '12 days', 84200),
  ('VW Crafter', 'Combi', 16, 850.00, 'Disponible', '#8b5cf6', current_date + interval '120 days', current_date + interval '90 days', current_date + interval '60 days', 62100),
  ('Ford Transit', 'Combi', 12, 850.00, 'Disponible', '#ec4899', current_date + interval '10 days', current_date + interval '60 days', current_date + interval '5 days', 105400),
  ('Mercedes-Benz O500', '1 piso', 40, 2200.00, 'Disponible', '#14b8a6', current_date + interval '200 days', current_date + interval '150 days', current_date + interval '80 days', 312000),
  ('Scania K310', '1 piso', 36, 2200.00, 'Disponible', '#f97316', current_date + interval '75 days', current_date + interval '30 days', current_date + interval '18 days', 278500),
  ('Volvo B9R', '1 piso', 28, 2200.00, 'Disponible', '#ef4444', current_date + interval '5 days', current_date + interval '15 days', current_date - interval '2 days', 401200),
  ('Scania K410 Doble', '2 pisos', 60, 3800.00, 'Disponible', '#3b82f6', current_date + interval '180 days', current_date + interval '100 days', current_date + interval '40 days', 156000),
  ('Mercedes Citaro G', '2 pisos', 55, 3800.00, 'Disponible', '#22c55e', current_date + interval '90 days', current_date + interval '45 days', current_date + interval '25 days', 98000),
  ('Setra S431 DT', '2 pisos', 50, 3800.00, 'Disponible', '#a855f7', current_date + interval '25 days', current_date + interval '8 days', current_date + interval '3 days', 223000)
on conflict do nothing;

insert into public.choferes (nombre, licencia_categoria, estado)
values
  ('Carlos Mendoza', 'D1', 'Disponible'),
  ('Laura Gómez', 'D2', 'Disponible'),
  ('Martín Ruiz', 'D1', 'Disponible'),
  ('Patricia Sosa', 'D2', 'Franco'),
  ('Diego Fernández', 'D1', 'Disponible'),
  ('Ana Beltrán', 'D2', 'Licencia')
on conflict do nothing;

insert into public.clientes (nombre_razon_social, cuil_cuit_dni, telefono, email)
values
  ('Colegio San Martín', '30-71234567-8', '223-555-0101', 'admin@sanmartin.edu.ar'),
  ('Empresa Logística Sur SRL', '30-70987654-3', '223-555-0202', 'viajes@logisticasur.com'),
  ('Club Atlético Rivadavia', '30-70111222-4', '223-555-0303', 'secretaria@rivadavia.org')
on conflict do nothing;

-- ─── MIGRAÇÃO incremental (proyectos ya existentes) ─────────────────────────
-- Ejecutar si la DB ya tenía el schema anterior:

-- alter table public.vehiculos add column if not exists color text not null default '#3b82f6';
-- alter table public.vehiculos add column if not exists matafuegos_vencimiento date;
-- alter table public.clientes alter column telefono set not null; -- solo si no hay nulls
-- alter table public.viajes add column if not exists fecha_hasta date;
-- alter table public.viajes add column if not exists hora_regreso time;
-- alter table public.viajes add column if not exists hora_llegada_aprox time;
-- alter table public.viajes add column if not exists paradas_intermedias text;
-- alter table public.viajes add column if not exists precio_base_calculado numeric(14,2);
-- alter table public.viajes add column if not exists estado_viaje text not null default 'Reservado';
-- update public.viajes set fecha_hasta = fecha_viaje where fecha_hasta is null and fecha_viaje is not null;
