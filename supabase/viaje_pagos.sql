create table if not exists public.viaje_pagos (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  monto numeric(14, 2) not null check (monto > 0),
  fecha_pago date not null default current_date,
  observaciones text,
  created_at timestamptz not null default now()
);

create index if not exists viaje_pagos_viaje_id_idx on public.viaje_pagos (viaje_id);
create index if not exists viaje_pagos_fecha_pago_idx on public.viaje_pagos (fecha_pago);

alter table public.viaje_pagos enable row level security;

drop policy if exists "viaje_pagos_select" on public.viaje_pagos;
drop policy if exists "viaje_pagos_insert" on public.viaje_pagos;
drop policy if exists "viaje_pagos_update" on public.viaje_pagos;
drop policy if exists "viaje_pagos_delete" on public.viaje_pagos;

create policy "viaje_pagos_select" on public.viaje_pagos
  for select to authenticated using (true);

create policy "viaje_pagos_insert" on public.viaje_pagos
  for insert to authenticated with check (true);

create policy "viaje_pagos_update" on public.viaje_pagos
  for update to authenticated using (true) with check (true);

create policy "viaje_pagos_delete" on public.viaje_pagos
  for delete to authenticated using (true);

comment on table public.viaje_pagos is
  'Señas y pagos parciales de un viaje. Se acumulan y restan del precio_total.';
