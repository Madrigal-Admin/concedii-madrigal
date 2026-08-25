-- =========================================================================
-- Migrare 2 — Concedii Madrigal
-- Adaugă: departamente + funcții ca liste prestabilite, și urmărirea
-- exactă (editabilă) a de unde s-au scăzut zilele la fiecare cerere aprobată.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Liste prestabilite: departamente și funcții
-- -------------------------------------------------------------------------

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

alter table public.departments enable row level security;
alter table public.positions enable row level security;

drop policy if exists "departments_select_all" on public.departments;
create policy "departments_select_all" on public.departments for select using (true);
drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin" on public.departments for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "positions_select_all" on public.positions;
create policy "positions_select_all" on public.positions for select using (true);
drop policy if exists "positions_write_admin" on public.positions;
create policy "positions_write_admin" on public.positions for all
  using (public.is_admin()) with check (public.is_admin());

-- preia automat departamentele deja existente la angajați, ca să nu pierzi nimic
insert into public.departments (name)
select distinct department from public.employees where department is not null
on conflict (name) do nothing;

-- câteva funcții uzuale pentru un cor — le poți edita/șterge/adăuga din aplicație
insert into public.positions (name) values
  ('Corist'), ('Dirijor'), ('Corepetitor'), ('Manager'), ('Contabil'), ('Administrator')
on conflict (name) do nothing;

-- -------------------------------------------------------------------------
-- 2. Legătura angajaților cu listele noi
-- -------------------------------------------------------------------------

alter table public.employees
  add column if not exists department_id uuid references public.departments(id),
  add column if not exists position_id uuid references public.positions(id);

-- leagă automat angajații existenți de departamentul lor (după nume)
update public.employees e
set department_id = d.id
from public.departments d
where e.department = d.name and e.department_id is null;

-- -------------------------------------------------------------------------
-- 3. Urmărirea exactă a de unde s-au scăzut zilele, per cerere aprobată
-- -------------------------------------------------------------------------

alter table public.leave_requests
  add column if not exists deducted_recoveries numeric not null default 0,
  add column if not exists deducted_y2 numeric not null default 0,
  add column if not exists deducted_y1 numeric not null default 0,
  add column if not exists deducted_y numeric not null default 0;

-- Notă: coloana veche "department" (text) rămâne neatinsă, ca să nu se piardă
-- nimic — aplicația folosește de-acum department_id / position_id.
