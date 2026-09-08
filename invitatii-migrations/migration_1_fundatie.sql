-- =========================================================================
-- Invitații — Migrare 1: fundație
-- Rulează o singură dată, în SQL Editor al proiectului Supabase unic
-- (qgofoygismknlqipgrng), alături de tabelele Hub deja existente.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. Funcții ajutătoare pentru rolurile Invitații (acces_tooluri, tool='invitatii')
-- -------------------------------------------------------------------------

create or replace function public.is_invitatii_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.acces_tooluri
    where angajat_id = public.current_angajat_id()
      and tool = 'invitatii'
      and rol = 'full'
  );
$$;

-- "checkin" = rolul "Verificare la intrare": vede Evenimente + Check-in,
-- dar nu Persoane, nu poate trimite invitații.
create or replace function public.is_invitatii_checkin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.acces_tooluri
    where angajat_id = public.current_angajat_id()
      and tool = 'invitatii'
      and rol in ('full', 'checkin')
  );
$$;

-- -------------------------------------------------------------------------
-- 1. Extensie per eveniment — conținut specific Invitațiilor, legat de
--    pilonul central `evenimente` (nu se duplică nume/dată/locație aici).
-- -------------------------------------------------------------------------

create table if not exists public.invitatii_profil_eveniment (
  eveniment_id uuid primary key references public.evenimente(id) on delete cascade,
  subiect_email text,
  mesaj_intro text,
  afis_url text
);

alter table public.invitatii_profil_eveniment enable row level security;

drop policy if exists "invitatii_profil_eveniment_select" on public.invitatii_profil_eveniment;
create policy "invitatii_profil_eveniment_select" on public.invitatii_profil_eveniment for select
  using (public.is_invitatii_checkin());

drop policy if exists "invitatii_profil_eveniment_write" on public.invitatii_profil_eveniment;
create policy "invitatii_profil_eveniment_write" on public.invitatii_profil_eveniment for all
  using (public.is_invitatii_admin()) with check (public.is_invitatii_admin());

-- -------------------------------------------------------------------------
-- 2. persoane — o persoană o singură dată
-- -------------------------------------------------------------------------

create table if not exists public.persoane (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  prenume text not null,
  email text unique not null,
  institutie text,
  functie text,
  categorie text,
  abonat_invitatii boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.persoane enable row level security;

drop policy if exists "persoane_select" on public.persoane;
create policy "persoane_select" on public.persoane for select
  using (public.is_invitatii_admin());

drop policy if exists "persoane_write" on public.persoane;
create policy "persoane_write" on public.persoane for all
  using (public.is_invitatii_admin()) with check (public.is_invitatii_admin());

-- -------------------------------------------------------------------------
-- 3. invitatii — o persoană invitată la un eveniment (sau un invitat
--    nominalizat, fără rând în `persoane` — vezi cereri_invitati mai jos)
-- -------------------------------------------------------------------------

create table if not exists public.invitatii (
  id uuid primary key default gen_random_uuid(),
  eveniment_id uuid not null references public.evenimente(id) on delete cascade,
  persoana_id uuid references public.persoane(id) on delete set null,
  nume_complet_invitat text, -- folosit doar când persoana_id e gol (nominalizare)
  token uuid not null default gen_random_uuid(),
  status_rsvp text not null default 'in_asteptare' check (status_rsvp in ('in_asteptare', 'confirmat', 'refuzat')),
  data_rsvp timestamptz,
  prezent boolean not null default false,
  data_checkin timestamptz,
  categorie text,
  sursa text not null default 'trimitere' check (sursa in ('trimitere', 'nominalizare')),
  cerere_id uuid, -- FK adăugat mai jos, după ce există tabelul cereri_invitati
  created_at timestamptz not null default now()
);

create unique index if not exists invitatii_token_key on public.invitatii(token);

alter table public.invitatii enable row level security;

drop policy if exists "invitatii_select" on public.invitatii;
create policy "invitatii_select" on public.invitatii for select
  using (public.is_invitatii_checkin());

drop policy if exists "invitatii_write_admin" on public.invitatii;
create policy "invitatii_write_admin" on public.invitatii for all
  using (public.is_invitatii_admin()) with check (public.is_invitatii_admin());

-- "Verificare la intrare" poate DOAR bifa prezența, nimic altceva
drop policy if exists "invitatii_checkin_update" on public.invitatii;
create policy "invitatii_checkin_update" on public.invitatii for update
  using (public.is_invitatii_checkin())
  with check (public.is_invitatii_checkin());

-- -------------------------------------------------------------------------
-- 4. cereri_invitati — nominalizare invitați de către staff (Corist/
--    Organizare/Management), pentru evenimente viitoare
-- -------------------------------------------------------------------------

create table if not exists public.cereri_invitati (
  id uuid primary key default gen_random_uuid(),
  eveniment_id uuid not null references public.evenimente(id) on delete cascade,
  solicitant_nume text not null,
  solicitant_functie text not null check (solicitant_functie in ('Corist', 'Organizare', 'Management')),
  invitati jsonb not null, -- array de nume, ex. ["Ion Popescu", "Maria Ionescu"]
  status text not null default 'in_asteptare' check (status in ('in_asteptare', 'aprobata')),
  data_cerere timestamptz not null default now()
);

alter table public.cereri_invitati enable row level security;

drop policy if exists "cereri_invitati_select" on public.cereri_invitati;
create policy "cereri_invitati_select" on public.cereri_invitati for select
  using (public.is_invitatii_admin());

drop policy if exists "cereri_invitati_write" on public.cereri_invitati;
create policy "cereri_invitati_write" on public.cereri_invitati for update
  using (public.is_invitatii_admin()) with check (public.is_invitatii_admin());

alter table public.invitatii
  add constraint invitatii_cerere_id_fkey foreign key (cerere_id) references public.cereri_invitati(id);
