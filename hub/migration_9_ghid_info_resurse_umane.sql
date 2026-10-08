-- =========================================================================
-- Hub — Migrare 9: "Documente Resurse Umane" devine "Informații Resurse
-- Umane" — nu mai e o listă de fișiere de descărcat, ci un text explicativ
-- (eventual în pași), cu buton opțional către o pagină din Hub (ex: tool-ul
-- Resurse Umane). Editabil tot din Admin Hub, fără cod.
-- Rulează o singură dată, în SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Tabel nou — listă de blocuri de text, în ordine. Fiecare bloc poate
--    avea, opțional, un buton care trimite spre o pagină din Hub.
-- -------------------------------------------------------------------------

create table if not exists public.ghid_info_resurse_umane (
  id uuid primary key default gen_random_uuid(),
  ordine integer not null default 0,
  text text not null,
  buton_text text,   -- ex: "Mergi la Resurse Umane" — null dacă blocul n-are buton
  buton_link text,   -- ex: "/HR/"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ghid_info_resurse_umane enable row level security;

drop policy if exists "ghid_info_ru_select_all" on public.ghid_info_resurse_umane;
create policy "ghid_info_ru_select_all" on public.ghid_info_resurse_umane for select using (true);

drop policy if exists "ghid_info_ru_write_admin" on public.ghid_info_resurse_umane;
create policy "ghid_info_ru_write_admin" on public.ghid_info_resurse_umane for all
  using (public.is_hub_admin()) with check (public.is_hub_admin());

-- Exemplu — chiar textul pe care mi l-ai descris, ca punct de plecare.
-- Îl editezi/ștergi din Admin Hub → "Ghid: Info Resurse Umane".
insert into public.ghid_info_resurse_umane (ordine, text, buton_text, buton_link)
select
  0,
  'Mergi în cardul "Resurse Umane" din Hub — acolo ai detalii despre soldul zilelor tale de concediu. De acolo poți solicita și documentele eliberate de Resurse Umane, cum ar fi cereri de concediu și adeverințe.',
  'Mergi la Resurse Umane',
  '/HR/'
where not exists (select 1 from public.ghid_info_resurse_umane);

-- -------------------------------------------------------------------------
-- 2. Curățăm tabelul vechi "ghid_documente" (din Etapa 2) — nu mai e
--    folosit, categoria nu mai gestionează fișiere de descărcat.
-- -------------------------------------------------------------------------

drop policy if exists "ghid_documente_select_all" on public.ghid_documente;
drop policy if exists "ghid_documente_write_admin" on public.ghid_documente;
drop table if exists public.ghid_documente;

drop policy if exists "ghid_documente_storage_select_authenticated" on storage.objects;
drop policy if exists "ghid_documente_storage_write_admin" on storage.objects;

-- Notă: bucket-ul de Storage "ghid-documente" a rămas gol/nefolosit — nu
-- se poate șterge sigur din SQL, doar manual din Supabase Dashboard →
-- Storage (pas opțional, doar pentru curățenie — vezi instrucțiunile).
