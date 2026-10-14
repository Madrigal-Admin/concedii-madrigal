-- =========================================================================
-- RAPOARTE — Migrarea 2: Modulul B (Raport post-eveniment) + data de
-- sfârșit în calendar
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- Rulează O SINGURĂ DATĂ, în SQL Editor, DUPĂ migrarea 1 (fundația).
-- (Dacă apare pop-up-ul "Potential issues", alege "Run and enable RLS".)
-- Scriptul poate fi rulat și a doua oară fără pagube.
--
-- Ce face:
--   1. Adaugă "data_sfarsit" în evenimente (calendar). Pentru cele existente
--      se pune provizoriu data evenimentului; se corectează la următoarea
--      sincronizare ClickUp (butonul din calendar).
--   2. Tipurile de eveniment (Madrigal, Cantus Mundi etc.) legate de
--      etichetele ClickUp, + câmpurile specifice și matricea câmp × tip.
--   3. Tabelul rapoartelor post-eveniment, istoricul lor și lista de
--      colaboratori externi din echipele de organizare.
--   4. Reguli de acces (RLS) și reguli automate (ca la rapoartele de
--      activitate): doar evenimente încheiate, fără ștergere, istoric automat.
-- NU modifică și nu șterge date existente.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Calendar: data de sfârșit
-- -------------------------------------------------------------------------
alter table public.evenimente add column if not exists data_sfarsit date;

update public.evenimente set data_sfarsit = data where data_sfarsit is null and data is not null;

-- -------------------------------------------------------------------------
-- 2. Funcții de rol pentru modulul B
-- -------------------------------------------------------------------------
create or replace function public.rap_e_admin_postev()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.rap_rol() in ('admin_general', 'admin_postev'), false) $$;

create or replace function public.rap_poate_raporta_postev()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.rap_rol() in ('admin_general', 'admin_postev', 'angajat'), false) $$;

grant execute on function public.rap_e_admin_postev() to authenticated;
grant execute on function public.rap_poate_raporta_postev() to authenticated;

-- -------------------------------------------------------------------------
-- 3. Tipuri de eveniment, câmpuri specifice, matrice
-- -------------------------------------------------------------------------
create table if not exists public.rap_tipuri (
  cod text primary key,
  nume text not null,
  eticheta_clickup text, -- eticheta din ClickUp (litere mici) care aduce tipul automat
  prioritate integer not null default 4,
  ordine integer not null default 0,
  activ boolean not null default true
);

insert into public.rap_tipuri (cod, nume, eticheta_clickup, prioritate, ordine) values
  ('madrigal', 'Madrigal', 'madrigal', 3, 1),
  ('cantus_mundi', 'Cantus Mundi', 'cantus mundi', 2, 2),
  ('symphonia_mundi', 'Symphonia Mundi', 'symphonia mundi', 1, 3),
  ('galeria_madrigal', 'Galeria Madrigal', 'galeria madrigal', 4, 4),
  ('academia_dirijat', 'Academia de Dirijat', 'academia de dirijat', 4, 5),
  ('forum_cantus_mundi', 'Forum Cantus Mundi', 'forum', 4, 6)
on conflict (cod) do nothing;

create table if not exists public.rap_postev_campuri (
  cod text primary key,
  eticheta text not null,
  tip text not null check (tip in ('numar', 'text', 'text_lung', 'link', 'contacte')),
  ajutor text,
  in_statistici boolean not null default false,
  ordine integer not null default 0,
  activ boolean not null default true
);

insert into public.rap_postev_campuri (cod, eticheta, tip, ajutor, in_statistici, ordine) values
  ('spectatori', 'Numărul de spectatori', 'numar',
   'Estimare cât mai reală a numărului de spectatori ai evenimentului (din gradul de ocupare al sălii, din numărul de bilete vândute, din comunicatele de presă post-eveniment etc.).', true, 1),
  ('voluntari', 'Numărul de voluntari', 'numar', 'Numărul voluntarilor la eveniment.', true, 2),
  ('coruri', 'Numărul corurilor participante', 'numar', 'Se trece numărul corurilor de copii care au participat la eveniment.', true, 3),
  ('dirijori_cor', 'Numărul dirijorilor de cor participanți', 'numar', 'Se trece numărul total al dirijorilor care au participat la eveniment.', true, 4),
  ('dirijori_orchestra', 'Numărul dirijorilor de orchestră participanți', 'numar', 'Se trece numărul total al dirijorilor care au participat la eveniment.', true, 5),
  ('orchestre', 'Numărul orchestrelor participante', 'numar', 'Se trece numărul orchestrelor care au participat la eveniment.', true, 6),
  ('copii', 'Numărul copiilor participanți', 'numar', 'Se trece numărul total al copiilor care au participat la eveniment.', true, 7),
  ('link_nume', 'Link către lista cu numele dirijorilor și copiilor', 'link',
   'Poți introduce un link către un document sau un tabel cu numele dirijorilor și ale copiilor participanți.', false, 8),
  ('contacte', 'Datele de contact ale organizatorului', 'contacte',
   'Se trec numele instituției, numele persoanei de contact, numărul de telefon și adresa de e-mail.', false, 9)
on conflict (cod) do nothing;

-- mod: O = obligatoriu, F = facultativ, B = apare după bifa „a fost cazul",
--      C = apare dacă „În calitate de" ≠ Organizator (și atunci e obligatoriu)
create table if not exists public.rap_postev_campuri_tipuri (
  camp_cod text not null references public.rap_postev_campuri(cod) on delete cascade,
  tip_cod text not null references public.rap_tipuri(cod) on delete cascade,
  mod text not null check (mod in ('O', 'F', 'B', 'C')),
  primary key (camp_cod, tip_cod)
);

insert into public.rap_postev_campuri_tipuri (camp_cod, tip_cod, mod)
select c.cod, t.cod, m.mod
from (values
  ('spectatori', 'B'), ('voluntari', 'B'), ('contacte', 'C')
) as m(camp, mod)
join public.rap_postev_campuri c on c.cod = m.camp
cross join public.rap_tipuri t
on conflict do nothing;

insert into public.rap_postev_campuri_tipuri (camp_cod, tip_cod, mod) values
  ('coruri', 'cantus_mundi', 'O'),
  ('dirijori_cor', 'cantus_mundi', 'O'),
  ('dirijori_orchestra', 'symphonia_mundi', 'O'),
  ('orchestre', 'symphonia_mundi', 'O'),
  ('copii', 'cantus_mundi', 'O'),
  ('copii', 'symphonia_mundi', 'O'),
  ('link_nume', 'cantus_mundi', 'F'),
  ('link_nume', 'symphonia_mundi', 'F')
on conflict do nothing;

-- Colaboratori externi din echipele de organizare (reținuți pentru rapoartele următoare)
create table if not exists public.rap_echipa_externi (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists rap_echipa_externi_nume_idx on public.rap_echipa_externi (lower(btrim(nume)));

-- -------------------------------------------------------------------------
-- 4. Rapoartele post-eveniment
-- -------------------------------------------------------------------------
create table if not exists public.rap_postev (
  id uuid primary key default gen_random_uuid(),
  eveniment_id uuid references public.evenimente(id) on delete restrict,
  eveniment_manual boolean not null default false,
  eveniment_nume text, -- numele din calendar în momentul raportării
  autor_user_id uuid default auth.uid(),
  responsabil_angajat_id uuid not null references public.angajati(id),
  tipuri text[] not null check (array_length(tipuri, 1) >= 1),
  data_inceput date not null,
  data_sfarsit date not null,
  localitati jsonb not null,  -- [{"localitate": "București", "nr": 3}, ...]
  locatie text not null,
  echipa jsonb not null,      -- [{"tip": "angajat", "angajat_id": "...", "nume": "..."}, {"tip": "extern", "nume": "..."}]
  denumire_oficiala text not null,
  implicare text not null check (implicare in ('Organizator', 'Partener', 'Invitat')),
  valori jsonb not null default '{}'::jsonb, -- câmpuri specifice (număr / text / link)
  bife jsonb not null default '{}'::jsonb,   -- bifele „a fost cazul"
  contacte jsonb not null default '[]'::jsonb,
  stare text not null default 'trimis' check (stare in ('trimis', 'in_verificare', 'aprobat', 'respins')),
  motiv_stare text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (data_sfarsit >= data_inceput),
  check (jsonb_typeof(localitati) = 'array' and jsonb_array_length(localitati) >= 1),
  check (jsonb_typeof(echipa) = 'array' and jsonb_array_length(echipa) >= 1),
  check (eveniment_manual or eveniment_id is not null)
);

-- un singur raport pe eveniment din calendar
create unique index if not exists rap_postev_un_raport_pe_eveniment_idx
  on public.rap_postev (eveniment_id) where eveniment_id is not null;
create index if not exists rap_postev_autor_idx on public.rap_postev (autor_user_id);

create table if not exists public.rap_postev_istoric (
  id uuid primary key default gen_random_uuid(),
  raport_id uuid not null references public.rap_postev(id) on delete restrict,
  actiune text not null,
  stare text,
  motiv text,
  user_id uuid,
  nume_utilizator text,
  la timestamptz not null default now()
);
create index if not exists rap_postev_istoric_raport_idx on public.rap_postev_istoric (raport_id);

-- -------------------------------------------------------------------------
-- 5. Reguli de acces (RLS)
-- -------------------------------------------------------------------------
alter table public.rap_tipuri enable row level security;
alter table public.rap_postev_campuri enable row level security;
alter table public.rap_postev_campuri_tipuri enable row level security;
alter table public.rap_echipa_externi enable row level security;
alter table public.rap_postev enable row level security;
alter table public.rap_postev_istoric enable row level security;

-- configurare: toți cu acces citesc; scrie doar Admin general
drop policy if exists rap_tipuri_select on public.rap_tipuri;
create policy rap_tipuri_select on public.rap_tipuri for select using (public.rap_are_acces());
drop policy if exists rap_tipuri_write on public.rap_tipuri;
create policy rap_tipuri_write on public.rap_tipuri for all
  using (public.rap_e_admin_general()) with check (public.rap_e_admin_general());

drop policy if exists rap_postev_campuri_select on public.rap_postev_campuri;
create policy rap_postev_campuri_select on public.rap_postev_campuri for select using (public.rap_are_acces());
drop policy if exists rap_postev_campuri_write on public.rap_postev_campuri;
create policy rap_postev_campuri_write on public.rap_postev_campuri for all
  using (public.rap_e_admin_general()) with check (public.rap_e_admin_general());

drop policy if exists rap_postev_campuri_tipuri_select on public.rap_postev_campuri_tipuri;
create policy rap_postev_campuri_tipuri_select on public.rap_postev_campuri_tipuri for select using (public.rap_are_acces());
drop policy if exists rap_postev_campuri_tipuri_write on public.rap_postev_campuri_tipuri;
create policy rap_postev_campuri_tipuri_write on public.rap_postev_campuri_tipuri for all
  using (public.rap_e_admin_general()) with check (public.rap_e_admin_general());

-- colaboratori externi: citesc cei care pot raporta; adaugă cei care pot raporta
drop policy if exists rap_echipa_externi_select on public.rap_echipa_externi;
create policy rap_echipa_externi_select on public.rap_echipa_externi for select
  using (public.rap_poate_raporta_postev());
drop policy if exists rap_echipa_externi_insert on public.rap_echipa_externi;
create policy rap_echipa_externi_insert on public.rap_echipa_externi for insert
  with check (public.rap_poate_raporta_postev());

-- rapoarte: autorul își vede raportul; adminii de post-eveniment le văd pe toate
drop policy if exists rap_postev_select on public.rap_postev;
create policy rap_postev_select on public.rap_postev for select
  using (public.rap_e_admin_postev() or autor_user_id = auth.uid());

drop policy if exists rap_postev_insert on public.rap_postev;
create policy rap_postev_insert on public.rap_postev for insert
  with check (stare = 'trimis' and public.rap_poate_raporta_postev());

drop policy if exists rap_postev_update on public.rap_postev;
create policy rap_postev_update on public.rap_postev for update
  using (
    public.rap_e_admin_postev()
    or (autor_user_id = auth.uid() and public.rap_poate_raporta_postev() and stare in ('trimis', 'respins'))
  )
  with check (
    public.rap_e_admin_postev()
    or (autor_user_id = auth.uid() and stare = 'trimis')
  );
-- (fără politică de ștergere: rapoartele nu se șterg niciodată)

drop policy if exists rap_postev_istoric_select on public.rap_postev_istoric;
create policy rap_postev_istoric_select on public.rap_postev_istoric for select
  using (
    public.rap_e_admin_postev()
    or exists (select 1 from public.rap_postev r where r.id = raport_id and r.autor_user_id = auth.uid())
  );

-- -------------------------------------------------------------------------
-- 6. Reguli automate
-- -------------------------------------------------------------------------
create or replace function public.rap_postev_inainte_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ev record;
begin
  if new.data_sfarsit >= current_date then
    raise exception 'Raportul se poate depune doar după încheierea evenimentului.';
  end if;
  if new.eveniment_id is not null then
    select * into ev from public.evenimente where id = new.eveniment_id;
    if not found then
      raise exception 'Evenimentul nu există în calendar.';
    end if;
    if coalesce(ev.data_sfarsit, ev.data) is null or coalesce(ev.data_sfarsit, ev.data) >= current_date then
      raise exception 'Evenimentul din calendar nu s-a încheiat încă.';
    end if;
    new.eveniment_nume := ev.nume;
    new.eveniment_manual := false;
  else
    new.eveniment_manual := true;
  end if;
  new.stare := 'trimis';
  new.autor_user_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists rap_postev_bi on public.rap_postev;
create trigger rap_postev_bi before insert on public.rap_postev
  for each row execute function public.rap_postev_inainte_insert();

create or replace function public.rap_postev_inainte_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.eveniment_id := old.eveniment_id;
  new.eveniment_manual := old.eveniment_manual;
  new.eveniment_nume := old.eveniment_nume;
  new.autor_user_id := old.autor_user_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.data_sfarsit >= current_date then
    raise exception 'Data de sfârșit trebuie să fie în trecut.';
  end if;

  if not public.rap_e_admin_postev() then
    new.stare := 'trimis';
    new.motiv_stare := old.motiv_stare;
    return new;
  end if;

  if new.stare = 'respins' and coalesce(btrim(new.motiv_stare), '') = '' then
    raise exception 'Respingerea are nevoie de un motiv.';
  end if;
  if old.stare = 'aprobat' and new.stare <> 'aprobat' and coalesce(btrim(new.motiv_stare), '') = '' then
    raise exception 'Redeschiderea unui raport aprobat are nevoie de un motiv.';
  end if;
  if new.stare = 'aprobat' and old.stare <> 'aprobat' then
    new.motiv_stare := null;
  end if;
  return new;
end $$;

drop trigger if exists rap_postev_bu on public.rap_postev;
create trigger rap_postev_bu before update on public.rap_postev
  for each row execute function public.rap_postev_inainte_update();

drop trigger if exists rap_postev_bd on public.rap_postev;
create trigger rap_postev_bd before delete on public.rap_postev
  for each row execute function public.rap_blocheaza_stergerea();

create or replace function public.rap_postev_istoric_fn()
returns trigger language plpgsql security definer set search_path = public
as $$
declare nume text; act text;
begin
  select coalesce(g.nume_complet, u.email) into nume
  from auth.users u left join public.angajati g on g.user_id = u.id
  where u.id = auth.uid();

  if tg_op = 'INSERT' then
    act := 'Depus';
  elsif old.stare is distinct from new.stare then
    act := case new.stare
      when 'trimis' then 'Retrimis'
      when 'in_verificare' then case when old.stare = 'aprobat' then 'Redeschis' else 'Preluat în verificare' end
      when 'aprobat' then 'Aprobat'
      when 'respins' then 'Respins'
    end;
  else
    act := 'Conținut modificat';
  end if;

  insert into public.rap_postev_istoric (raport_id, actiune, stare, motiv, user_id, nume_utilizator)
  values (new.id, act, new.stare, case when tg_op = 'UPDATE' then new.motiv_stare end, auth.uid(), nume);
  return new;
end $$;

drop trigger if exists rap_postev_ai on public.rap_postev;
create trigger rap_postev_ai after insert or update on public.rap_postev
  for each row execute function public.rap_postev_istoric_fn();

-- -------------------------------------------------------------------------
-- 7. Funcții utile
-- -------------------------------------------------------------------------

-- Evenimentele din calendar care au deja raport (indiferent de autor), ca să
-- nu mai fie oferite a doua oară. Întoarce doar identificatorii.
create or replace function public.rap_evenimente_raportate()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select eveniment_id from public.rap_postev
  where eveniment_id is not null and public.rap_are_acces()
$$;
grant execute on function public.rap_evenimente_raportate() to authenticated;

-- Lista localităților folosite deja în rapoarte (pentru sugestii în formular;
-- crește singură pe măsură ce se completează rapoarte).
create or replace function public.rap_localitati()
returns table (localitate text)
language sql stable security definer set search_path = public
as $$
  select distinct btrim(e ->> 'localitate')
  from public.rap_postev r, jsonb_array_elements(r.localitati) e
  where public.rap_are_acces() and btrim(coalesce(e ->> 'localitate', '')) <> ''
  order by 1
$$;
grant execute on function public.rap_localitati() to authenticated;
