-- Monto de seña en viajes + datos extendidos de choferes

alter table public.viajes
  add column if not exists monto_sena numeric(14, 2) not null default 0
    check (monto_sena >= 0);

alter table public.choferes
  add column if not exists dni text,
  add column if not exists carnet_conducir_vencimiento date,
  add column if not exists libreta_trabajo_vencimiento date;
