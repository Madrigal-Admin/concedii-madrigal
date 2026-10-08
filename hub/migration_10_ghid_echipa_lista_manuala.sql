-- =========================================================================
-- Hub — Migrare 10: "Echipa Madrigal" devine o LISTĂ MANUALĂ simplă
-- (nume + rol), nu un grid legat de tabelul angajați. Nu mai există
-- filtrare pe departament și nu mai avem nevoie de bifele adăugate la
-- Etapa 1 pe angajați — le curățăm, ca să nu rămână date nefolosite.
-- Rulează o singură dată, în SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Curățăm ce am adăugat la Etapa 1 și nu mai folosim: view-ul, cele 3
--    coloane de pe angajați, și bifa de pe departments. Nimic din toate
--    astea nu a fost populat cu date reale, deci nu se pierde nimic.
-- -------------------------------------------------------------------------

drop view if exists public.ghid_echipa_public;

alter table public.angajati
  drop column if exists foto_url,
  drop column if exists vizibil_in_ghid,
  drop column if exists parte_din_conducere;

alter table public.departments
  drop column if exists afisat_in_conducere_ghid;

-- -------------------------------------------------------------------------
-- 2. Tabel nou — listă simplă, întreținută manual din Admin Hub: nume +
--    rol (text liber, ex: "Manager", "Secretariat", "Resurse Umane").
--    Nicio legătură cu angajati — o schimbi oricând, independent de cine
--    ocupă efectiv acel rol.
-- -------------------------------------------------------------------------

create table if not exists public.ghid_echipa_persoane (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  rol text not null,
  ordine integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ghid_echipa_persoane enable row level security;

drop policy if exists "ghid_echipa_persoane_select_all" on public.ghid_echipa_persoane;
create policy "ghid_echipa_persoane_select_all" on public.ghid_echipa_persoane for select using (true);

drop policy if exists "ghid_echipa_persoane_write_admin" on public.ghid_echipa_persoane;
create policy "ghid_echipa_persoane_write_admin" on public.ghid_echipa_persoane for all
  using (public.is_hub_admin()) with check (public.is_hub_admin());

-- Exemple, clar marcate — le editezi din Admin Hub → "Ghid: Echipa".
insert into public.ghid_echipa_persoane (nume, rol, ordine)
select * from (values
  ('[EXEMPLU] Nume Prenume', 'Manager', 0),
  ('[EXEMPLU] Nume Prenume', 'Secretariat', 1),
  ('[EXEMPLU] Nume Prenume', 'Resurse Umane', 2),
  ('[EXEMPLU] Nume Prenume', 'Financiar-Contabil', 3),
  ('[EXEMPLU] Nume Prenume', 'Administrativ', 4)
) as exemple(nume, rol, ordine)
where not exists (select 1 from public.ghid_echipa_persoane);
