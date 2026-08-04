-- Unificar Traffic dentro de Combi

update public.vehiculos
set categoria = 'Combi'
where categoria = 'Traffic';

update public.presupuestos
set vehiculo_categoria = 'Combi'
where vehiculo_categoria = 'Traffic';

alter table public.vehiculos drop constraint if exists vehiculos_categoria_check;
alter table public.vehiculos
  add constraint vehiculos_categoria_check
  check (categoria in ('Combi', '1 piso', '2 pisos'));
