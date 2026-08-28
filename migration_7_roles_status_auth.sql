-- =========================================================================
-- Migrare 7 — Concedii Madrigal
-- Adaugă: roluri de admin (HR Admin / HR Operational), legătura angajat -
-- cont de autentificare (necesară pentru a putea promova un angajat la rol
-- de admin), noul status intermediar pentru cererile de concediu, și
-- restricționează introducerea cererilor doar pentru utilizatori autentificați.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Roluri de admin
-- -------------------------------------------------------------------------

alter table public.admins
  add column if not exists role text not null default 'full' check (role in ('full', 'limited'));

-- is_admin() rămâne "e admin, indiferent de rol" (folosit pt. cereri/recuperări).
-- is_full_admin() e folosit doar pentru zonele restricționate (Setări).
create or replace function public.is_full_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.admins where id = auth.uid() and role = 'full');
$$;

-- -------------------------------------------------------------------------
-- 2. Legătura angajat <-> cont de autentificare
--    (necesară ca un HR Admin să poată promova un angajat existent la rol
--    de admin, fără să aibă acces la lista brută de conturi din Supabase)
-- -------------------------------------------------------------------------

alter table public.employees
  add column if not exists auth_user_id uuid;

create unique index if not exists employees_auth_user_id_key on public.employees(auth_user_id);

-- angajatul își poate actualiza propriul rând DOAR ca să-și lege contul (auth_user_id)
drop policy if exists "employees_link_own_account" on public.employees;
create policy "employees_link_own_account" on public.employees for update
  using (email = (auth.jwt() ->> 'email'))
  with check (email = (auth.jwt() ->> 'email'));

-- -------------------------------------------------------------------------
-- 3. Restricționează scrierile din Setări doar pentru HR Admin (rol "full")
-- -------------------------------------------------------------------------

drop policy if exists "employees_write_admin" on public.employees;
create policy "employees_write_admin" on public.employees for all
  using (public.is_full_admin()) with check (public.is_full_admin());
-- (politica de mai sus se aplică pe lângă "employees_link_own_account";
--  Postgres OR-ează politicile permisive de același tip, deci angajatul
--  își poate lega contul chiar dacă nu e admin)

drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin" on public.departments for all
  using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "positions_write_admin" on public.positions;
create policy "positions_write_admin" on public.positions for all
  using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "legal_holidays_write_admin" on public.legal_holidays;
create policy "legal_holidays_write_admin" on public.legal_holidays for all
  using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "year_allocations_write_admin" on public.year_allocations;
create policy "year_allocations_write_admin" on public.year_allocations for all
  using (public.is_full_admin()) with check (public.is_full_admin());

-- doar HR Admin poate gestiona alți admini (promovare / retrogradare)
drop policy if exists "admins_write_full_admin" on public.admins;
create policy "admins_write_full_admin" on public.admins for all
  using (public.is_full_admin()) with check (public.is_full_admin());

-- -------------------------------------------------------------------------
-- 4. Cereri de concediu — status nou + doar utilizatori autentificați pot
--    trimite cereri (nu se mai poate insera fără cont, din formularul public)
-- -------------------------------------------------------------------------

alter table public.leave_requests drop constraint if exists leave_requests_leave_type_check;
alter table public.leave_requests drop constraint if exists leave_requests_status_check;
alter table public.leave_requests
  add constraint leave_requests_status_check check (status in ('submitted', 'pending', 'approved', 'rejected'));
alter table public.leave_requests
  add constraint leave_requests_leave_type_check check (leave_type in ('Odihnă', 'Medical', 'Fără Plată', 'Evenimente Speciale'));
alter table public.leave_requests alter column status set default 'submitted';

drop policy if exists "requests_insert_all" on public.leave_requests;
create policy "requests_insert_authenticated" on public.leave_requests for insert
  with check (
    auth.uid() is not null and (
      public.is_admin() or
      employee_id in (select id from public.employees where email = (auth.jwt() ->> 'email'))
    )
  );

drop policy if exists "certificate_requests_insert_all" on public.certificate_requests;
create policy "certificate_requests_insert_authenticated" on public.certificate_requests for insert
  with check (
    auth.uid() is not null and (
      public.is_admin() or
      employee_id in (select id from public.employees where email = (auth.jwt() ->> 'email'))
    )
  );

-- Notă: nu uita să dezactivezi manual "Confirm email" din Supabase ->
-- Authentication -> Settings, ca angajații să se poată loga imediat după
-- ce își creează contul, fără niciun pas de confirmare prin email.
