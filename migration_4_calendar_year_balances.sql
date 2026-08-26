-- =========================================================================
-- Migrare 4 — Concedii Madrigal
-- Ancorează soldurile de ani calendaristici REALI (nu "acum 2 ani" relativ la
-- azi), ca aplicația să treacă singură la anul nou pe 1 ianuarie și să
-- expire corect zilele pe 30 iunie, an de an, fără nicio intervenție manuală.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Alocări pe an calendaristic real, per angajat
-- -------------------------------------------------------------------------

create table if not exists public.year_allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  year int not null,
  days numeric not null default 0,
  unique (employee_id, year)
);

alter table public.year_allocations enable row level security;

drop policy if exists "year_allocations_select_all" on public.year_allocations;
create policy "year_allocations_select_all" on public.year_allocations for select using (true);
drop policy if exists "year_allocations_write_admin" on public.year_allocations;
create policy "year_allocations_write_admin" on public.year_allocations for all
  using (public.is_admin()) with check (public.is_admin());

-- preia automat soldul inițial completat anterior (opening_y2/y1/y), legându-l
-- de anii calendaristici reali de acum, ca să nu pierzi nimic din ce ai introdus deja
insert into public.year_allocations (employee_id, year, days)
select id, extract(year from now())::int - 2, opening_y2 from public.employees
on conflict (employee_id, year) do update set days = excluded.days;

insert into public.year_allocations (employee_id, year, days)
select id, extract(year from now())::int - 1, opening_y1 from public.employees
on conflict (employee_id, year) do update set days = excluded.days;

insert into public.year_allocations (employee_id, year, days)
select id, extract(year from now())::int, opening_y from public.employees
on conflict (employee_id, year) do update set days = excluded.days;

-- -------------------------------------------------------------------------
-- 2. Distribuția scăzută per cerere, legată de ani calendaristici reali
--    (înlocuiește vechile coloane deducted_y2 / deducted_y1 / deducted_y,
--    care erau relative la "azi" și s-ar fi stricat la trecerea anilor)
-- -------------------------------------------------------------------------

alter table public.leave_requests
  add column if not exists deduction jsonb not null default '{}'::jsonb;

update public.leave_requests
set deduction = jsonb_strip_nulls(jsonb_build_object(
  'recoveries', nullif(deducted_recoveries, 0),
  (extract(year from now())::int - 2)::text, nullif(deducted_y2, 0),
  (extract(year from now())::int - 1)::text, nullif(deducted_y1, 0),
  (extract(year from now())::int)::text, nullif(deducted_y, 0)
))
where status = 'approved' and deduction = '{}'::jsonb;

-- Notă: coloanele vechi (opening_y2, opening_y1, opening_y, deducted_recoveries,
-- deducted_y2, deducted_y1, deducted_y) rămân neatinse în bază, ca să nu se
-- piardă nimic, dar aplicația nu le mai folosește de acum — a trecut pe
-- year_allocations și pe coloana "deduction".
