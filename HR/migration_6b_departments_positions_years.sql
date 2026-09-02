-- =========================================================================
-- Migrare 6b — Concedii Madrigal
-- Recreează tabelele "departments", "positions" și "year_allocations",
-- care existau deja pe proiectul Supabase vechi (create direct din
-- interfață), dar nu fuseseră niciodată salvate ca fișier de migrație.
-- Rulează tot fișierul o singură dată, în SQL Editor, ÎNAINTE de migrația 7.
-- =========================================================================

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.year_allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  days numeric not null default 0
);

alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.year_allocations enable row level security;

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

drop policy if exists "year_allocations_select_all" on public.year_allocations;
create policy "year_allocations_select_all" on public.year_allocations for select using (true);

drop policy if exists "year_allocations_write_admin" on public.year_allocations;
create policy "year_allocations_write_admin" on public.year_allocations for all
  using (public.is_admin()) with check (public.is_admin());
