-- =========================================================================
-- Hub — Migrare 11: "Echipa" devine organigramă vizuală — fiecare persoană
-- din listă poate avea un "superior" (tot din aceeași listă), ca să se
-- poată desena cutii conectate prin linii, nu doar o listă plată.
-- Rulează o singură dată, în SQL Editor.
-- =========================================================================

alter table public.ghid_echipa_persoane
  add column if not exists parinte_id uuid references public.ghid_echipa_persoane(id) on delete set null;

create index if not exists ghid_echipa_persoane_parinte_idx
  on public.ghid_echipa_persoane (parinte_id);

-- Dacă ai rulat deja migration_10 și ai cele 5 rânduri exemplu (Manager,
-- Secretariat, Resurse Umane, Financiar-Contabil, Administrativ), le lăsăm
-- neatinse — toate rămân "pe primul nivel" (fără superior) până le
-- organizezi din Admin Hub → "Ghid: Echipa", unde alegi superiorul
-- fiecăreia.
