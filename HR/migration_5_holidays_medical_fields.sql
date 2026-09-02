-- =========================================================================
-- Migrare 5 — Concedii Madrigal
-- Adaugă zilele libere legale (introduse manual, an de an) și câmpurile
-- suplimentare pentru concediul medical (Serie și număr, Cod indemnizație).
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

create table if not exists public.legal_holidays (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  label text
);

alter table public.legal_holidays enable row level security;

drop policy if exists "legal_holidays_select_all" on public.legal_holidays;
create policy "legal_holidays_select_all" on public.legal_holidays for select using (true);
drop policy if exists "legal_holidays_write_admin" on public.legal_holidays;
create policy "legal_holidays_write_admin" on public.legal_holidays for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.leave_requests
  add column if not exists medical_series_number text,
  add column if not exists medical_code text;

-- Notă: coloana "leave_type" acceptă în continuare 'Medical' la nivel de bază
-- de date (așa e nevoie, ca Adminul să poată introduce concedii medicale) —
-- restricția "doar Admin alege Medical" e aplicată în interfață, nu în bază.
