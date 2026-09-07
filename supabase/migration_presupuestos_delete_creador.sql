-- Historial de cotizaciones: borrar + ver creador

drop policy if exists "presupuestos_delete" on public.presupuestos;
create policy "presupuestos_delete" on public.presupuestos
  for delete to authenticated
  using (true);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);
