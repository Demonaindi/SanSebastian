-- Actualizar disponibilidad: Finalizado no bloquea la unidad.
-- Varios viajes el mismo día se permiten si los horarios no se solapan.
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

create or replace function public.sync_chofer_estado_from_viajes(p_chofer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_activo boolean;
begin
  if p_chofer_id is null then
    return;
  end if;

  select estado into v_estado from choferes where id = p_chofer_id;
  if not found then
    return;
  end if;

  if v_estado in ('Franco', 'Licencia') then
    return;
  end if;

  select exists (
    select 1
    from viajes v
    where v.chofer_id = p_chofer_id
      and coalesce(v.estado_viaje, 'Reservado') not in ('Cancelado', 'Finalizado')
  ) into v_activo;

  if v_activo then
    update choferes set estado = 'En viaje' where id = p_chofer_id and estado <> 'En viaje';
  else
    update choferes set estado = 'Disponible' where id = p_chofer_id and estado = 'En viaje';
  end if;
end;
$$;

create or replace function public.trg_viajes_sync_chofer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_chofer_estado_from_viajes(old.chofer_id);
    return old;
  end if;

  perform public.sync_chofer_estado_from_viajes(new.chofer_id);

  if tg_op = 'UPDATE' and old.chofer_id is distinct from new.chofer_id then
    perform public.sync_chofer_estado_from_viajes(old.chofer_id);
  end if;

  return new;
end;
$$;

drop trigger if exists viajes_sync_chofer on public.viajes;
create trigger viajes_sync_chofer
  after insert or update of chofer_id, estado_viaje or delete
  on public.viajes
  for each row
  execute function public.trg_viajes_sync_chofer();

create or replace function public.finalizar_viaje(p_viaje_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chofer uuid;
begin
  select chofer_id into v_chofer from viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'Viaje no encontrado';
  end if;

  update viajes
  set estado_viaje = 'Finalizado'
  where id = p_viaje_id;

  perform public.sync_chofer_estado_from_viajes(v_chofer);
end;
$$;

grant execute on function public.sync_chofer_estado_from_viajes(uuid) to authenticated;
grant execute on function public.finalizar_viaje(uuid) to authenticated;

-- Recalcular estados actuales
do $$
declare
  r record;
begin
  for r in select id from choferes where estado in ('Disponible', 'En viaje') loop
    perform public.sync_chofer_estado_from_viajes(r.id);
  end loop;
end;
$$;
