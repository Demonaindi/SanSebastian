-- Hasta 3 choferes por viaje con viáticos individuales

create table if not exists public.viaje_choferes (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  chofer_id uuid not null references public.choferes (id) on delete restrict,
  viaticos numeric(14, 2) not null default 0 check (viaticos >= 0),
  orden smallint not null check (orden between 1 and 3),
  created_at timestamptz not null default now(),
  unique (viaje_id, chofer_id),
  unique (viaje_id, orden)
);

create index if not exists idx_viaje_choferes_viaje on public.viaje_choferes (viaje_id);
create index if not exists idx_viaje_choferes_chofer on public.viaje_choferes (chofer_id);

insert into public.viaje_choferes (viaje_id, chofer_id, viaticos, orden)
select v.id, v.chofer_id, 0, 1
from public.viajes v
where v.chofer_id is not null
  and not exists (
    select 1 from public.viaje_choferes vc where vc.viaje_id = v.id
  );

alter table public.viaje_choferes enable row level security;

drop policy if exists "viaje_choferes_select" on public.viaje_choferes;
drop policy if exists "viaje_choferes_insert" on public.viaje_choferes;
drop policy if exists "viaje_choferes_update" on public.viaje_choferes;
drop policy if exists "viaje_choferes_delete" on public.viaje_choferes;

create policy "viaje_choferes_select" on public.viaje_choferes
  for select to authenticated using (true);

create policy "viaje_choferes_insert" on public.viaje_choferes
  for insert to authenticated with check (public.is_admin());

create policy "viaje_choferes_update" on public.viaje_choferes
  for update to authenticated using (public.is_admin());

create policy "viaje_choferes_delete" on public.viaje_choferes
  for delete to authenticated using (public.is_admin());

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
    where coalesce(v.estado_viaje, 'Reservado') not in ('Cancelado', 'Finalizado')
      and (
        v.chofer_id = p_chofer_id
        or exists (
          select 1 from viaje_choferes vc
          where vc.viaje_id = v.id and vc.chofer_id = p_chofer_id
        )
      )
  ) into v_activo;

  if v_activo then
    update choferes set estado = 'En viaje' where id = p_chofer_id and estado <> 'En viaje';
  else
    update choferes set estado = 'Disponible' where id = p_chofer_id and estado = 'En viaje';
  end if;
end;
$$;

create or replace function public.trg_viaje_choferes_sync()
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

drop trigger if exists viaje_choferes_sync on public.viaje_choferes;
create trigger viaje_choferes_sync
  after insert or update of chofer_id or delete
  on public.viaje_choferes
  for each row
  execute function public.trg_viaje_choferes_sync();

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

    insert into viaje_choferes (viaje_id, chofer_id, viaticos, orden)
    values (p_viaje_id, v_chofer, v_viaticos, v_orden);

    v_seen := array_append(v_seen, v_chofer);
    if v_first is null then
      v_first := v_chofer;
    end if;
  end loop;

  update viajes set chofer_id = v_first where id = p_viaje_id;
end;
$$;

grant execute on function public.set_viaje_choferes(uuid, jsonb) to authenticated;

create or replace function public.finalizar_viaje(p_viaje_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_exists boolean;
begin
  select exists(select 1 from viajes where id = p_viaje_id) into v_exists;
  if not v_exists then
    raise exception 'Viaje no encontrado';
  end if;

  perform 1 from viajes where id = p_viaje_id for update;

  update viajes
  set estado_viaje = 'Finalizado'
  where id = p_viaje_id;

  for r in
    select distinct chofer_id from (
      select chofer_id from viajes where id = p_viaje_id and chofer_id is not null
      union
      select chofer_id from viaje_choferes where viaje_id = p_viaje_id
    ) x
  loop
    perform public.sync_chofer_estado_from_viajes(r.chofer_id);
  end loop;
end;
$$;

do $$
declare
  r record;
begin
  for r in select id from choferes where estado in ('Disponible', 'En viaje') loop
    perform public.sync_chofer_estado_from_viajes(r.id);
  end loop;
end;
$$;
