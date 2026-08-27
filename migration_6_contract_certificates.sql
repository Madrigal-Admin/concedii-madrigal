-- =========================================================================
-- Migrare 6 — Concedii Madrigal
-- Adaugă "Număr contract" per angajat și tabelul pentru Cereri adeverințe.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

alter table public.employees
  add column if not exists contract_number text;

create table if not exists public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  certificate_type text not null check (certificate_type in (
    'Adeverință de vechime', 'Adeverință de salariu', 'Adeverință de salariat', 'Fluturaș de salariu'
  )),
  purpose text,
  delivery_method text not null check (delivery_method in (
    'Pe mail-ul personal', 'Ridicare de la biroul Resurse Umane'
  )),
  employee_note text,
  status text not null default 'pending' check (status in ('pending', 'issued')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.certificate_requests enable row level security;

drop policy if exists "certificate_requests_select_all" on public.certificate_requests;
create policy "certificate_requests_select_all" on public.certificate_requests for select using (true);

drop policy if exists "certificate_requests_insert_all" on public.certificate_requests;
create policy "certificate_requests_insert_all" on public.certificate_requests for insert with check (true);

drop policy if exists "certificate_requests_update_admin" on public.certificate_requests;
create policy "certificate_requests_update_admin" on public.certificate_requests for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "certificate_requests_delete_admin" on public.certificate_requests;
create policy "certificate_requests_delete_admin" on public.certificate_requests for delete
  using (public.is_admin());
