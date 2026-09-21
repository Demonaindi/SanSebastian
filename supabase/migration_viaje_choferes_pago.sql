alter table public.viaje_choferes
  add column if not exists pago_viaje numeric(14, 2) not null default 0
    check (pago_viaje >= 0);

create or replace function public.set_viaje_choferes(
  p_viaje_id uuid,
  p_items jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_orden integer := 0;
  v_chofer uuid;
  v_viaticos numeric;
  v_pago numeric;
  v_first uuid := null;
  v_seen uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede asignar choferes';
  end if;

  if not exists (select 1 from viajes where id = p_viaje_id) then
    raise exception 'Viaje no encontrado';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Formato inválido de choferes';
  end if;

  if jsonb_array_length(p_items) > 3 then
    raise exception 'Máximo 3 choferes por viaje';
  end if;

  delete from viaje_choferes where viaje_id = p_viaje_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_chofer := nullif(v_item->>'chofer_id', '')::uuid;
    if v_chofer is null then
      continue;
    end if;

    if v_chofer = any (v_seen) then
      raise exception 'No se puede asignar el mismo chofer más de una vez';
    end if;

    if not exists (select 1 from choferes where id = v_chofer) then
      raise exception 'Chofer no encontrado';
    end if;

    v_orden := v_orden + 1;
    if v_orden > 3 then
      raise exception 'Máximo 3 choferes por viaje';
    end if;

    v_viaticos := coalesce((v_item->>'viaticos')::numeric, 0);
    if v_viaticos < 0 then
      raise exception 'Los viáticos no pueden ser negativos';
    end if;

    v_pago := coalesce((v_item->>'pago_viaje')::numeric, 0);
    if v_pago < 0 then
      raise exception 'El pago de viaje no puede ser negativo';
    end if;

    insert into viaje_choferes (viaje_id, chofer_id, viaticos, pago_viaje, orden)
    values (p_viaje_id, v_chofer, v_viaticos, v_pago, v_orden);

    v_seen := array_append(v_seen, v_chofer);
    if v_first is null then
      v_first := v_chofer;
    end if;
  end loop;

  update viajes set chofer_id = v_first where id = p_viaje_id;
end;
$$;
