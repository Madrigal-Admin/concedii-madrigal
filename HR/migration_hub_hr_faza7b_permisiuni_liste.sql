-- =========================================================================
-- Fix permisiuni: departments/positions/attributions trebuie scrise atât
-- de Admin Hub, cât și de HR Admin complet (ambele tool-uri le gestionează).
-- Rulează o singură dată, în SQL Editor.
-- =========================================================================

drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin" on public.departments for all
  using (public.is_hub_admin() or public.is_full_admin())
  with check (public.is_hub_admin() or public.is_full_admin());

drop policy if exists "positions_write_admin" on public.positions;
create policy "positions_write_admin" on public.positions for all
  using (public.is_hub_admin() or public.is_full_admin())
  with check (public.is_hub_admin() or public.is_full_admin());

drop policy if exists "attributions_write_admin" on public.attributions;
create policy "attributions_write_admin" on public.attributions for all
  using (public.is_hub_admin() or public.is_full_admin())
  with check (public.is_hub_admin() or public.is_full_admin());
