-- Funciones operativas — San Sebastián
-- Ejecutar DESPUÉS de migration_operativa.sql (un solo Run).

-- Quitar la versión vieja de confirmar_viaje (otra firma) para evitar sobrecargas
drop function if exists public.confirmar_viaje(text, text, integer, date, time, numeric, numeric, uuid, uuid, uuid);

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
  p_exclude_viaje_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fin date := coalesce(p_fecha_hasta, p_fecha_desde);
  v_conflicto integer;
begin
  select count(*) into v_conflicto
  from viajes v
  where v.vehiculo_id = p_vehiculo_id
    and coalesce(v.estado_viaje, 'Reservado') not in ('Cancelado')
    and (p_exclude_viaje_id is null or v.id <> p_exclude_viaje_id)
    and v.fecha_viaje <= v_fin
    and public.viaje_rango_fin(v.fecha_viaje, v.fecha_hasta) >= p_fecha_desde;

  return v_conflicto = 0;
end;
$$;

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
begin
  select * into v_viaje from viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'Viaje no encontrado';
  end if;

  v_vehiculo := coalesce(p_vehiculo_id, v_viaje.vehiculo_id);
  v_hasta := coalesce(p_fecha_hasta, p_fecha_viaje);

  if v_vehiculo is null then
    raise exception 'El viaje no tiene unidad asignada';
  end if;

  if not public.vehiculo_disponible_en_rango(v_vehiculo, p_fecha_viaje, v_hasta, p_viaje_id) then
    raise exception 'La unidad no está disponible en el nuevo rango';
  end if;

  update viajes set
    fecha_viaje = p_fecha_viaje,
    fecha_hasta = v_hasta,
    hora_viaje = coalesce(p_hora_viaje, hora_viaje),
    hora_regreso = coalesce(p_hora_regreso, hora_regreso),
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

grant execute on function public.confirmar_viaje to authenticated;
grant execute on function public.reprogramar_viaje to authenticated;
grant execute on function public.cancelar_viaje to authenticated;
grant execute on function public.generar_presupuesto to authenticated;
grant execute on function public.vehiculo_disponible_en_rango to authenticated;
