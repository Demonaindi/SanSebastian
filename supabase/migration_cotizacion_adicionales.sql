-- Cotización: adicionales + valor_km / precio_base en viajes y presupuestos

create table if not exists public.adicionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.viajes
  add column if not exists valor_km numeric(12, 2),
  add column if not exists precio_base numeric(14, 2),
  add column if not exists adicionales jsonb not null default '[]'::jsonb;

alter table public.presupuestos
  add column if not exists valor_km numeric(12, 2),
  add column if not exists precio_base numeric(14, 2),
  add column if not exists adicionales jsonb not null default '[]'::jsonb;

insert into public.adicionales (nombre)
values
  ('Coordinación'),
  ('Guía turístico'),
  ('Desayuno')
on conflict (nombre) do nothing;

alter table public.adicionales enable row level security;

drop policy if exists "adicionales_select" on public.adicionales;
drop policy if exists "adicionales_insert" on public.adicionales;
drop policy if exists "adicionales_update" on public.adicionales;
create policy "adicionales_select" on public.adicionales for select to authenticated using (true);
create policy "adicionales_insert" on public.adicionales for insert to authenticated with check (true);
create policy "adicionales_update" on public.adicionales for update to authenticated using (true);

grant all on public.adicionales to authenticated;

drop function if exists public.confirmar_viaje(
  text, text, integer, date, time, numeric, numeric, uuid, uuid, uuid,
  date, time, time, text, numeric, text
);
drop function if exists public.confirmar_viaje(
  p_origen text, p_destino text, p_pasajeros integer, p_fecha_viaje date,
  p_hora_viaje time without time zone, p_distancia_km numeric, p_precio_total numeric,
  p_cliente_id uuid, p_chofer_id uuid, p_vehiculo_id uuid, p_fecha_hasta date,
  p_hora_regreso time without time zone, p_hora_llegada_aprox time without time zone,
  p_paradas_intermedias text, p_precio_base_calculado numeric, p_estado_pago text
);
drop function if exists public.generar_presupuesto(
  text, text, integer, date, time, numeric, text, text, numeric, integer, text
);
drop function if exists public.generar_presupuesto(
  p_origen text, p_destino text, p_pasajeros integer, p_fecha_viaje date,
  p_hora_viaje time without time zone, p_distancia_km numeric, p_vehiculo_nombre text,
  p_vehiculo_categoria text, p_precio_total numeric, p_dias_validez integer,
  p_paradas_intermedias text
);

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
  p_estado_pago text default 'Pendiente',
  p_valor_km numeric default null,
  p_precio_base numeric default null,
  p_adicionales jsonb default '[]'::jsonb
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

  if not public.vehiculo_disponible_en_rango(p_vehiculo_id, p_fecha_viaje, v_fecha_hasta) then
    raise exception 'La unidad ya tiene una reserva en ese rango de fechas';
  end if;

  if p_chofer_id is not null and not exists (select 1 from choferes where id = p_chofer_id) then
    raise exception 'Chofer no encontrado';
  end if;

  insert into viajes (
    origen, destino, pasajeros,
    fecha_viaje, fecha_hasta, hora_viaje, hora_regreso, hora_llegada_aprox,
    distancia_km, precio_base_calculado, precio_total, paradas_intermedias,
    estado_pago, estado_viaje,
    cliente_id, chofer_id, vehiculo_id,
    valor_km, precio_base, adicionales
  ) values (
    p_origen, p_destino, p_pasajeros,
    p_fecha_viaje, v_fecha_hasta, p_hora_viaje, p_hora_regreso, p_hora_llegada_aprox,
    coalesce(p_distancia_km, 0), p_precio_base_calculado, p_precio_total, p_paradas_intermedias,
    coalesce(p_estado_pago, 'Pendiente'), 'Reservado',
    p_cliente_id, p_chofer_id, p_vehiculo_id,
    p_valor_km, coalesce(p_precio_base, p_precio_base_calculado), coalesce(p_adicionales, '[]'::jsonb)
  )
  returning id into v_viaje_id;

  return v_viaje_id;
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
  p_paradas_intermedias text default null,
  p_valor_km numeric default null,
  p_precio_base numeric default null,
  p_adicionales jsonb default '[]'::jsonb
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
    dias_validez, paradas_intermedias, created_by,
    valor_km, precio_base, adicionales
  ) values (
    v_numero, p_origen, p_destino, p_pasajeros, p_fecha_viaje, p_hora_viaje,
    coalesce(p_distancia_km, 0), p_vehiculo_nombre, p_vehiculo_categoria, p_precio_total,
    coalesce(p_dias_validez, 7), p_paradas_intermedias, auth.uid(),
    p_valor_km, p_precio_base, coalesce(p_adicionales, '[]'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.confirmar_viaje to authenticated;
grant execute on function public.generar_presupuesto to authenticated;
