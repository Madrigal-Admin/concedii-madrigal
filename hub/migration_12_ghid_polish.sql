-- =========================================================================
-- Hub — Migrare 12: rundă de "polish" pe Ghidul angajatului.
--
--   1. Bucket-ul "ghid-foto" devine PUBLIC — e folosit acum și pentru
--      imagini inserate direct în textul formatat (vezi punctul 2), care
--      au nevoie de un URL simplu, fără expirare.
--   2. "Despre Madrigal": nu mai e o listă de blocuri (paragraf/imagine),
--      ci UN SINGUR text formatat → tabel nou "ghid_despre" (un rând).
--   3. "Informații utile" și "Ghid Resurse Umane" (fostă "Informații
--      Resurse Umane") trec la aceeași structură nouă: Subiect / Titlu /
--      Text formatat + opțional un Link SAU un Fișier de descărcat.
--      Ambele tabele se recreează de la zero (conțineau doar exemple).
--   4. "Linkuri utile" (tab separat în Echipa Madrigal) se elimină —
--      conținutul de acest tip se adaugă acum ca intrări în "Informații
--      utile" (vezi exemplul inserat mai jos, la subiectul "Linkuri utile").
--
-- Rulează o singură dată, în SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Bucket "ghid-foto" → public.
-- -------------------------------------------------------------------------

update storage.buckets set public = true where id = 'ghid-foto';

-- -------------------------------------------------------------------------
-- 2. Despre Madrigal — tabel nou cu un singur rând (text formatat, HTML).
-- -------------------------------------------------------------------------

create table if not exists public.ghid_despre (
  id uuid primary key default gen_random_uuid(),
  continut_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ghid_despre enable row level security;

drop policy if exists "ghid_despre_select_all" on public.ghid_despre;
create policy "ghid_despre_select_all" on public.ghid_despre for select using (true);

drop policy if exists "ghid_despre_write_admin" on public.ghid_despre;
create policy "ghid_despre_write_admin" on public.ghid_despre for all
  using (public.is_hub_admin()) with check (public.is_hub_admin());

insert into public.ghid_despre (continut_html)
select '<h1>Despre Corul Național de Cameră "Madrigal"</h1><p>Scrie aici istoria, misiunea și valorile corului. Poți formata textul (mărime, bold, italic, culoare, centrare) și poți insera imagini din bara de sus.</p>'
where not exists (select 1 from public.ghid_despre);

-- Tabelul vechi de blocuri nu mai e folosit (a fost înlocuit de tabelul
-- de mai sus, cu un singur text formatat).
drop policy if exists "ghid_despre_select_all" on public.ghid_despre_blocuri;
drop policy if exists "ghid_despre_write_admin" on public.ghid_despre_blocuri;
drop table if exists public.ghid_despre_blocuri;

-- -------------------------------------------------------------------------
-- 3a. Informații utile — structură nouă. Conținea doar exemple, deci
--     recreăm tabelul de la zero (mai simplu și mai sigur decât alter).
-- -------------------------------------------------------------------------

drop policy if exists "ghid_intrebari_select_all" on public.ghid_intrebari;
drop policy if exists "ghid_intrebari_write_admin" on public.ghid_intrebari;
drop table if exists public.ghid_intrebari;

create table public.ghid_intrebari (
  id uuid primary key default gen_random_uuid(),
  ordine integer not null default 0,
  subiect text not null,
  titlu text not null,
  continut_html text not null default '',
  link text,          -- completat DOAR dacă nu există fisier_url
  fisier_url text,    -- cale în bucket-ul "ghid-foto", completat DOAR dacă nu există link
  fisier_nume text,   -- numele original al fișierului, pentru afișare
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ghid_intrebari enable row level security;

create policy "ghid_intrebari_select_all" on public.ghid_intrebari for select using (true);
create policy "ghid_intrebari_write_admin" on public.ghid_intrebari for all
  using (public.is_hub_admin()) with check (public.is_hub_admin());

insert into public.ghid_intrebari (ordine, subiect, titlu, continut_html, link) values
  (0, 'Concedii', 'Cum solicit o zi de concediu?',
   '<p>Mergi în cardul "Resurse Umane" din Hub — acolo poți vedea soldul zilelor tale de concediu și poți trimite o cerere.</p>',
   '/HR/'),
  (10, 'Linkuri utile', 'Grup WhatsApp — Corul Madrigal',
   '<p>Grupul oficial de WhatsApp pentru anunțuri și comunicare rapidă între colegi.</p>',
   'https://chat.whatsapp.com/'),
  (11, 'Linkuri utile', 'Calendarul evenimentelor',
   '<p>Toate repetițiile și concertele programate, într-un singur loc.</p>',
   '/calendar/');

-- -------------------------------------------------------------------------
-- 3b. Ghid Resurse Umane (fostă "Informații Resurse Umane") — aceeași
--     structură ca mai sus. Recreăm tabelul de la zero.
-- -------------------------------------------------------------------------

drop policy if exists "ghid_info_ru_select_all" on public.ghid_info_resurse_umane;
drop policy if exists "ghid_info_ru_write_admin" on public.ghid_info_resurse_umane;
drop table if exists public.ghid_info_resurse_umane;

create table public.ghid_info_resurse_umane (
  id uuid primary key default gen_random_uuid(),
  ordine integer not null default 0,
  subiect text not null,
  titlu text not null,
  continut_html text not null default '',
  link text,
  fisier_url text,
  fisier_nume text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ghid_info_resurse_umane enable row level security;

create policy "ghid_info_ru_select_all" on public.ghid_info_resurse_umane for select using (true);
create policy "ghid_info_ru_write_admin" on public.ghid_info_resurse_umane for all
  using (public.is_hub_admin()) with check (public.is_hub_admin());

insert into public.ghid_info_resurse_umane (ordine, subiect, titlu, continut_html, link) values
  (0, 'Adeverințe și documente', 'Cum obțin o adeverință?',
   '<p>Mergi în cardul "Resurse Umane" din Hub — de acolo poți solicita documentele eliberate de Resurse Umane, cum ar fi adeverințe și cereri de concediu.</p>',
   '/HR/');

-- -------------------------------------------------------------------------
-- 4. "Linkuri utile" (tab separat în Echipa Madrigal) — eliminat. Conținutul
--    s-a mutat deja (ca exemplu) în "Informații utile", la punctul 3a.
-- -------------------------------------------------------------------------

drop policy if exists "ghid_linkuri_utile_select_all" on public.ghid_linkuri_utile;
drop policy if exists "ghid_linkuri_utile_write_admin" on public.ghid_linkuri_utile;
drop table if exists public.ghid_linkuri_utile;
