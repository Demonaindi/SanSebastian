-- San Sebastián Transporte — Schema Supabase / PostgreSQL
-- Ejecutar en el SQL Editor de Supabase (proyecto nuevo o vacío)

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
  telefono text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.choferes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  licencia_categoria text not null default 'D1',
  estado text not null default 'Disponible'
    check (estado in ('Disponible', 'En viaje', 'Franco', 'Licencia')),
  created_at timestamptz not null default now()
);

create table if not exists public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null
    check (categoria in ('Combi', 'Traffic', '1 piso', '2 pisos')),
  capacidad integer not null check (capacidad > 0),
  tarifa_km numeric(12, 2) not null check (tarifa_km >= 0),
  estado text not null default 'Disponible'
    check (estado in ('Disponible', 'En viaje')),
  vtv_vencimiento date,
  seguro_vencimiento date,
  kilometraje integer not null default 0 check (kilometraje >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.viajes (
  id uuid primary key default gen_random_uuid(),
  origen text not null,
  destino text not null,
  pasajeros integer not null check (pasajeros > 0),
  fecha_viaje date,
  hora_viaje time,
  distancia_km numeric(10, 2) not null check (distancia_km >= 0),
  precio_total numeric(14, 2) not null check (precio_total >= 0),
  estado_pago text not null default 'Pendiente'
    check (estado_pago in ('Pendiente', 'Señado', 'Pagado')),
  cliente_id uuid references public.clientes (id) on delete set null,
  chofer_id uuid references public.choferes (id) on delete set null,
  vehiculo_id uuid references public.vehiculos (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.caja_diaria (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('Ingreso', 'Egreso')),
  concepto text not null,
  monto numeric(14, 2) not null check (monto > 0),
  viaje_id uuid references public.viajes (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_viajes_fecha on public.viajes (fecha_viaje);
create index if not exists idx_viajes_estado_pago on public.viajes (estado_pago);
create index if not exists idx_vehiculos_estado on public.vehiculos (estado);
create index if not exists idx_choferes_estado on public.choferes (estado);
create index if not exists idx_caja_created on public.caja_diaria (created_at desc);

-- ─── RPC: confirmar viaje (transacción atómica) ─────────────────────────────

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
  p_vehiculo_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viaje_id uuid;
  v_vehiculo_estado text;
  v_chofer_estado text;
begin
  select estado into v_vehiculo_estado from vehiculos where id = p_vehiculo_id for update;
  if not found then
    raise exception 'Vehículo no encontrado';
  end if;
  if v_vehiculo_estado <> 'Disponible' then
    raise exception 'El vehículo no está disponible';
  end if;

  select estado into v_chofer_estado from choferes where id = p_chofer_id for update;
  if not found then
    raise exception 'Chofer no encontrado';
  end if;
  if v_chofer_estado <> 'Disponible' then
    raise exception 'El chofer no está disponible';
  end if;

  insert into viajes (
    origen, destino, pasajeros, fecha_viaje, hora_viaje,
    distancia_km, precio_total, estado_pago,
    cliente_id, chofer_id, vehiculo_id
  ) values (
    p_origen, p_destino, p_pasajeros, p_fecha_viaje, p_hora_viaje,
    p_distancia_km, p_precio_total, 'Pendiente',
    p_cliente_id, p_chofer_id, p_vehiculo_id
  )
  returning id into v_viaje_id;

  update vehiculos set estado = 'En viaje' where id = p_vehiculo_id;
  update choferes set estado = 'En viaje' where id = p_chofer_id;

  return v_viaje_id;
end;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.choferes enable row level security;
alter table public.vehiculos enable row level security;
alter table public.viajes enable row level security;
alter table public.caja_diaria enable row level security;

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
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin());

-- Lectura para autenticados, escritura según rol
create policy "clientes_select" on public.clientes for select to authenticated using (true);
create policy "clientes_insert" on public.clientes for insert to authenticated with check (true);
create policy "clientes_update" on public.clientes for update to authenticated using (true);
create policy "clientes_delete" on public.clientes for delete to authenticated using (public.is_admin());

create policy "choferes_select" on public.choferes for select to authenticated using (true);
create policy "choferes_insert" on public.choferes for insert to authenticated with check (true);
create policy "choferes_update" on public.choferes for update to authenticated using (true);
create policy "choferes_delete" on public.choferes for delete to authenticated using (public.is_admin());

create policy "vehiculos_select" on public.vehiculos for select to authenticated using (true);
create policy "vehiculos_insert" on public.vehiculos for insert to authenticated with check (public.is_admin());
create policy "vehiculos_update" on public.vehiculos
  for update to authenticated using (true) with check (true);
create policy "vehiculos_delete" on public.vehiculos for delete to authenticated using (public.is_admin());

create policy "viajes_select" on public.viajes for select to authenticated using (true);
create policy "viajes_insert" on public.viajes for insert to authenticated with check (true);
create policy "viajes_update" on public.viajes for update to authenticated using (true);

create policy "caja_select" on public.caja_diaria for select to authenticated using (true);
create policy "caja_insert" on public.caja_diaria for insert to authenticated with check (true);
create policy "caja_delete" on public.caja_diaria for delete to authenticated using (public.is_admin());

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant execute on function public.confirmar_viaje to authenticated;
grant execute on function public.is_admin to authenticated;

-- ─── Datos iniciales ─────────────────────────────────────────────────────────

insert into public.vehiculos (nombre, categoria, capacidad, tarifa_km, estado, vtv_vencimiento, seguro_vencimiento, kilometraje)
values
  ('Renault Trafic', 'Traffic', 19, 1050.00, 'Disponible', current_date + interval '45 days', current_date + interval '20 days', 84200),
  ('VW Crafter', 'Combi', 16, 850.00, 'Disponible', current_date + interval '120 days', current_date + interval '90 days', 62100),
  ('Ford Transit', 'Combi', 12, 850.00, 'En viaje', current_date + interval '10 days', current_date + interval '60 days', 105400),
  ('Mercedes-Benz O500', '1 piso', 40, 2200.00, 'Disponible', current_date + interval '200 days', current_date + interval '150 days', 312000),
  ('Scania K310', '1 piso', 36, 2200.00, 'Disponible', current_date + interval '75 days', current_date + interval '30 days', 278500),
  ('Volvo B9R', '1 piso', 28, 2200.00, 'En viaje', current_date + interval '5 days', current_date + interval '15 days', 401200),
  ('Scania K410 Doble', '2 pisos', 60, 3800.00, 'Disponible', current_date + interval '180 days', current_date + interval '100 days', 156000),
  ('Mercedes Citaro G', '2 pisos', 55, 3800.00, 'Disponible', current_date + interval '90 days', current_date + interval '45 days', 98000),
  ('Setra S431 DT', '2 pisos', 50, 3800.00, 'En viaje', current_date + interval '25 days', current_date + interval '8 days', 223000)
on conflict do nothing;

insert into public.choferes (nombre, licencia_categoria, estado)
values
  ('Carlos Mendoza', 'D1', 'Disponible'),
  ('Laura Gómez', 'D2', 'Disponible'),
  ('Martín Ruiz', 'D1', 'En viaje'),
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
