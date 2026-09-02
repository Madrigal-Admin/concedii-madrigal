-- =========================================================================
-- Concedii Madrigal — schema Supabase
-- Rulează tot acest fișier o singură dată, în Supabase -> SQL Editor -> New query
-- =========================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- TABELE
-- -------------------------------------------------------------------------

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  department text,
  base_annual_days numeric not null default 21,
  created_at timestamptz not null default now()
);

create table if not exists public.overtime_recoveries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  days numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  leave_type text not null check (leave_type in ('Odihnă', 'Medical', 'Fără Plată', 'Evenimente Speciale')),
  start_date date not null,
  end_date date not null,
  working_days numeric not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Lista de conturi cu drepturi de Admin. Rândurile se adaugă manual din
-- SQL Editor (vezi README.md, pasul "Creează contul de Admin").
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade
);

-- -------------------------------------------------------------------------
-- FUNCȚIE AJUTĂTOARE — verifică dacă utilizatorul curent e Admin
-- (security definer = ocolește RLS ca să nu creeze recursivitate)
-- -------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------------------------

alter table public.employees enable row level security;
alter table public.overtime_recoveries enable row level security;
alter table public.leave_requests enable row level security;
alter table public.admins enable row level security;

-- employees: oricine poate CITI (necesar pentru dropdown-ul public),
-- doar Admin poate scrie.
drop policy if exists "employees_select_all" on public.employees;
create policy "employees_select_all" on public.employees for select using (true);

drop policy if exists "employees_write_admin" on public.employees;
create policy "employees_write_admin" on public.employees for all
  using (public.is_admin()) with check (public.is_admin());

-- overtime_recoveries: citire publică (angajatul își vede propriile
-- recuperări), scriere doar Admin.
drop policy if exists "recoveries_select_all" on public.overtime_recoveries;
create policy "recoveries_select_all" on public.overtime_recoveries for select using (true);

drop policy if exists "recoveries_write_admin" on public.overtime_recoveries;
create policy "recoveries_write_admin" on public.overtime_recoveries for all
  using (public.is_admin()) with check (public.is_admin());

-- leave_requests: oricine poate CITI și INSERA (formularul public),
-- doar Admin poate schimba statusul sau șterge.
drop policy if exists "requests_select_all" on public.leave_requests;
create policy "requests_select_all" on public.leave_requests for select using (true);

drop policy if exists "requests_insert_all" on public.leave_requests;
create policy "requests_insert_all" on public.leave_requests for insert with check (true);

drop policy if exists "requests_update_admin" on public.leave_requests;
create policy "requests_update_admin" on public.leave_requests for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "requests_delete_admin" on public.leave_requests;
create policy "requests_delete_admin" on public.leave_requests for delete
  using (public.is_admin());

-- admins: fiecare admin își poate citi doar propriul rând.
drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins for select using (auth.uid() = id);

-- -------------------------------------------------------------------------
-- DATE DEMONSTRATIVE (seed) — 5 angajați, câteva cereri și recuperări
-- Șterge acest bloc dacă nu vrei date de test.
-- -------------------------------------------------------------------------

insert into public.employees (full_name, email, department, base_annual_days) values
  ('Ana Popescu', 'ana.popescu@example.com', 'Soprane', 21),
  ('Mihai Ionescu', 'mihai.ionescu@example.com', 'Tenori', 24),
  ('Elena Dumitrescu', 'elena.dumitrescu@example.com', 'Alte', 25),
  ('Radu Constantin', 'radu.constantin@example.com', 'Bași', 21),
  ('Ioana Marinescu', 'ioana.marinescu@example.com', 'Administrativ', 22)
on conflict (email) do nothing;

-- recuperări demonstrative
insert into public.overtime_recoveries (employee_id, days, note)
select id, 2, 'Turneu weekend, mai' from public.employees where email = 'ana.popescu@example.com'
union all
select id, 1, 'Concert extraordinar' from public.employees where email = 'mihai.ionescu@example.com';

-- cereri demonstrative
insert into public.leave_requests (employee_id, employee_name, leave_type, start_date, end_date, working_days, status, reason)
select id, full_name, 'Odihnă', '2026-07-06'::date, '2026-07-10'::date, 5, 'approved', 'Vacanță de vară'
from public.employees where email = 'ana.popescu@example.com'
union all
select id, full_name, 'Odihnă', '2026-09-01'::date, '2026-09-03'::date, 3, 'pending', null
from public.employees where email = 'mihai.ionescu@example.com'
union all
select id, full_name, 'Medical', '2026-03-10'::date, '2026-03-11'::date, 2, 'approved', 'Concediu medical'
from public.employees where email = 'elena.dumitrescu@example.com'
union all
select id, full_name, 'Odihnă', '2026-01-15'::date, '2026-01-20'::date, 4, 'approved', null
from public.employees where email = 'radu.constantin@example.com'
union all
select id, full_name, 'Fără Plată', '2026-05-05'::date, '2026-05-06'::date, 2, 'rejected', 'Motive personale'
from public.employees where email = 'ioana.marinescu@example.com';
