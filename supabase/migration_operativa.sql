-- Migración incremental — San Sebastián (aplicar en proyectos ya existentes)
-- Ejecutar en el SQL Editor de Supabase.

alter table public.vehiculos add column if not exists color text not null default '#3b82f6';
alter table public.vehiculos add column if not exists matafuegos_vencimiento date;

alter table public.viajes add column if not exists fecha_hasta date;
alter table public.viajes add column if not exists hora_regreso time;
alter table public.viajes add column if not exists hora_llegada_aprox time;
alter table public.viajes add column if not exists paradas_intermedias text;
alter table public.viajes add column if not exists precio_base_calculado numeric(14, 2);
alter table public.viajes add column if not exists estado_viaje text;

update public.viajes
set fecha_hasta = fecha_viaje
where fecha_hasta is null and fecha_viaje is not null;

update public.viajes
set estado_viaje = 'Reservado'
where estado_viaje is null;

alter table public.viajes alter column estado_viaje set default 'Reservado';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'viajes_estado_viaje_check'
  ) then
    alter table public.viajes
      add constraint viajes_estado_viaje_check
      check (estado_viaje in ('Reservado', 'Confirmado', 'Cancelado', 'Reprogramado', 'Finalizado'));
  end if;
end $$;

-- Clientes: teléfono obligatorio cuando no haya nulos
update public.clientes set telefono = coalesce(nullif(telefono, ''), 'Sin teléfono') where telefono is null;
alter table public.clientes alter column telefono set not null;

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
  dias_validez integer not null default 7,
  condiciones_pago text not null default 'Seña del 50% para confirmar. Saldo restante 48 hs antes del viaje. Cancelaciones con menos de 72 hs: seña no reembolsable.',
  paradas_intermedias text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create sequence if not exists public.presupuesto_numero_seq start 1;

alter table public.presupuestos enable row level security;

drop policy if exists "presupuestos_select" on public.presupuestos;
drop policy if exists "presupuestos_insert" on public.presupuestos;
create policy "presupuestos_select" on public.presupuestos for select to authenticated using (true);
create policy "presupuestos_insert" on public.presupuestos for insert to authenticated with check (true);

grant usage, select on sequence public.presupuesto_numero_seq to authenticated;

-- Luego re-ejecutá desde schema.sql las funciones:
-- confirmar_viaje, reprogramar_viaje, cancelar_viaje, generar_presupuesto, vehiculo_disponible_en_rango
