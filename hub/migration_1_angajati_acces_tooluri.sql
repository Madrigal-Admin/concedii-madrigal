-- =========================================================================
-- Hub — Migrare 1: tabele centrale (angajati, acces_tooluri)
-- Creează structura de identitate centrală, și copiază (nu mută) datele
-- existente din employees (HR), ca punct de plecare.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

-- 1. Completăm "departments" cu valorile deja folosite în HR, dacă lipsesc
--    ("positions" rămâne goală — se completează manual din Hub, la Faza 5)
insert into public.departments (name)
select distinct department
from public.employees
where department is not null
  and not exists (
    select 1 from public.departments d where d.name = employees.department
  );

-- 2. Tabelul central de identitate
create table if not exists public.angajati (
  id uuid primary key default gen_random_uuid(),
  nume_complet text not null,
  email text unique,
  departament_id uuid references public.departments(id),
  functie_id uuid references public.positions(id),
  activ boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.angajati enable row level security;

drop policy if exists "angajati_select_all" on public.angajati;
create policy "angajati_select_all" on public.angajati for select using (true);

drop policy if exists "angajati_write_admin" on public.angajati;
create policy "angajati_write_admin" on public.angajati for all
  using (public.is_admin()) with check (public.is_admin());

-- 3. Tabelul de acces per tool
create table if not exists public.acces_tooluri (
  id uuid primary key default gen_random_uuid(),
  angajat_id uuid not null references public.angajati(id) on delete cascade,
  tool text not null check (tool in ('hub', 'hr', 'invitatii')),
  rol text not null,
  created_at timestamptz not null default now(),
  unique (angajat_id, tool)
);

alter table public.acces_tooluri enable row level security;

drop policy if exists "acces_tooluri_select_all" on public.acces_tooluri;
create policy "acces_tooluri_select_all" on public.acces_tooluri for select using (true);

drop policy if exists "acces_tooluri_write_admin" on public.acces_tooluri;
create policy "acces_tooluri_write_admin" on public.acces_tooluri for all
  using (public.is_admin()) with check (public.is_admin());

-- 4. Copiem (nu mutăm) angajații existenți din HR în angajati
insert into public.angajati (nume_complet, email, departament_id, activ)
select
  e.full_name,
  e.email,
  d.id,
  true
from public.employees e
left join public.departments d on d.name = e.department
where not exists (
  select 1 from public.angajati a where a.email = e.email
);
