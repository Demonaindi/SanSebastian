-- Permitir varios viajes el mismo día en la misma unidad si los horarios no se solapan.

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
