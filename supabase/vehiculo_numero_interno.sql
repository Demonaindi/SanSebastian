alter table public.vehiculos
  add column if not exists numero_interno text;

comment on column public.vehiculos.numero_interno is
  'Número interno de flota (uso interno; no incluir en cotizaciones al cliente).';
