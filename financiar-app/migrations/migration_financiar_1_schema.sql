-- =========================================================================
-- FINANCIAR — Migrarea 1: schema completă (referat de necesitate + decont)
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- Rulează O SINGURĂ DATĂ, în SQL Editor, ÎNAINTE de a încărca aplicația.
-- (Dacă apare pop-up-ul cu "Potential issues", alege "Run and enable RLS".)
-- Poate fi rulat și a doua oară fără pagube.
--
-- TOATE SUMELE SUNT FĂRĂ TVA și se păstrează ca numere întregi în BANI
-- (ex. 23,00 lei = 2300), ca să nu apară erori de rotunjire.
--
-- Ce face:
--   1. Adaugă "financiar" în lista de tool-uri permise din acces_tooluri.
--   2. Funcții de rol (Angajat / Admin Financiar / Admin Hub).
--   3. Setări: unități de măsură, surse de finanțare, semnatari, liste
--      prestabilite de prețuri, șabloane Word.
--   4. Referatul de necesitate + liniile lui.
--   5. Decontul de cheltuieli + borderoul.
--   6. Istoric automat, numerotare internă (REF-2026-0001 / DEC-2026-0001).
--   7. Reguli de acces (RLS) și reguli automate (trigger).
--   8. Spațiu privat pentru scanurile semnate.
--   9. Date de pornire (unități de măsură, surse, semnatari, 2 prețuri).
-- NU modifică și nu șterge nimic din celelalte tool-uri.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. "financiar" devine tool permis în acces_tooluri
-- -------------------------------------------------------------------------
do $$
declare c record; def text;
begin
  for c in
    select conname, pg_get_constraintdef(oid) as d from pg_constraint
    where conrelid = 'public.acces_tooluri'::regclass
      and contype = 'c' and pg_get_constraintdef(oid) ilike '%tool%'
  loop
    if c.d not ilike '%financiar%' then
      def := replace(c.d, '''rapoarte''::text', '''rapoarte''::text, ''financiar''::text');
      if def = c.d then
        raise exception 'Nu am găsit lista de tool-uri în constrângere: %', c.d;
      end if;
      execute format('alter table public.acces_tooluri drop constraint %I', c.conname);
      execute format('alter table public.acces_tooluri add constraint %I %s', c.conname, def);
    end if;
  end loop;
end $$;

-- -------------------------------------------------------------------------
-- 2. Funcții de rol. Roluri în Financiar: angajat, admin_financiar.
--    Adminul Hub = admin_general peste tot.
-- -------------------------------------------------------------------------
create or replace function public.fin_angajat_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.angajati where user_id = auth.uid() limit 1 $$;

create or replace function public.fin_rol()
returns text language sql stable security definer set search_path = public
as $$
  select case
    when public.is_hub_admin() then 'admin_general'
    else (
      select a.rol from public.acces_tooluri a
      join public.angajati g on g.id = a.angajat_id
      where g.user_id = auth.uid() and a.tool = 'financiar'
      limit 1
    )
  end
$$;

create or replace function public.fin_e_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.fin_rol() in ('admin_general', 'admin_financiar'), false) $$;

create or replace function public.fin_are_acces()
returns boolean language sql stable security definer set search_path = public
as $$ select public.fin_rol() is not null $$;

grant execute on function public.fin_angajat_id() to authenticated;
grant execute on function public.fin_rol() to authenticated;
grant execute on function public.fin_e_admin() to authenticated;
grant execute on function public.fin_are_acces() to authenticated;

-- -------------------------------------------------------------------------
-- 3. Setări și liste
-- -------------------------------------------------------------------------
create table if not exists public.fin_um (
  id uuid primary key default gen_random_uuid(),
  denumire text not null,
  ordine integer not null default 0,
  activ boolean not null default true
);
create unique index if not exists fin_um_denumire_idx on public.fin_um (lower(denumire));

create table if not exists public.fin_surse (
  id uuid primary key default gen_random_uuid(),
  denumire text not null,
  ordine integer not null default 0,
  activ boolean not null default true
);
create unique index if not exists fin_surse_denumire_idx on public.fin_surse (lower(denumire));

-- un singur rând (id = 1): semnatarii "Avizat" și "Aprobat"
create table if not exists public.fin_setari (
  id integer primary key default 1 check (id = 1),
  avizat_functie text not null default '',
  avizat_nume text not null default '',
  aprobat_functie text not null default '',
  aprobat_nume text not null default ''
);

-- Liste prestabilite (prețuri limitate prin lege). Un rând = o versiune de preț.
create table if not exists public.fin_liste (
  id uuid primary key default gen_random_uuid(),
  denumire text not null check (length(btrim(denumire)) > 0),
  um text not null,
  pret_bani bigint not null check (pret_bani >= 0),
  mod_pret text not null default 'fix' check (mod_pret in ('fix', 'plafon')),
  tip text not null default 'ambele' check (tip in ('servicii', 'produse', 'ambele')),
  valabil_de_la date not null default current_date,
  valabil_pana date,
  activ boolean not null default true,
  created_at timestamptz not null default now(),
  check (valabil_pana is null or valabil_pana >= valabil_de_la)
);

-- Două versiuni ale aceluiași element nu se pot suprapune în timp
create or replace function public.fin_liste_verifica()
returns trigger language plpgsql
as $$
begin
  new.denumire := btrim(new.denumire);
  if new.activ and exists (
    select 1 from public.fin_liste x
    where x.id <> new.id and x.activ
      and lower(x.denumire) = lower(new.denumire)
      and (x.tip = new.tip or x.tip = 'ambele' or new.tip = 'ambele')
      and daterange(x.valabil_de_la, coalesce(x.valabil_pana, 'infinity'::date), '[]')
          && daterange(new.valabil_de_la, coalesce(new.valabil_pana, 'infinity'::date), '[]')
  ) then
    raise exception 'Există deja un preț pentru acest element în perioada aleasă. Închide mai întâi perioada veche (valabil până).';
  end if;
  return new;
end $$;

drop trigger if exists fin_liste_bi on public.fin_liste;
create trigger fin_liste_bi before insert or update on public.fin_liste
  for each row execute function public.fin_liste_verifica();

-- Șabloane Word (versiuni păstrate; unul singur activ pentru fiecare document)
create table if not exists public.fin_sabloane (
  id uuid primary key default gen_random_uuid(),
  modul text not null check (modul in ('referat', 'decont')),
  versiune integer not null,
  nume_fisier text not null,
  continut_base64 text not null,
  markeri jsonb not null default '[]'::jsonb,
  activ boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (modul, versiune)
);
create unique index if not exists fin_sabloane_un_activ_idx on public.fin_sabloane (modul) where activ;

-- Contoare pentru numerele interne (REF-2026-0001)
create table if not exists public.fin_contoare (
  tip text not null,
  an integer not null,
  ultim integer not null default 0,
  primary key (tip, an)
);

create or replace function public.fin_numar_urmator(p_tip text, p_prefix text)
returns text language plpgsql security definer set search_path = public
as $$
declare v_an integer := extract(year from current_date)::int; v_n integer;
begin
  insert into public.fin_contoare (tip, an, ultim) values (p_tip, v_an, 1)
  on conflict (tip, an) do update set ultim = public.fin_contoare.ultim + 1
  returning ultim into v_n;
  return p_prefix || '-' || v_an || '-' || lpad(v_n::text, 4, '0');
end $$;

-- -------------------------------------------------------------------------
-- 4. Referatul de necesitate
-- -------------------------------------------------------------------------
create table if not exists public.fin_referate (
  id uuid primary key default gen_random_uuid(),
  cod text not null unique,
  tip text not null check (tip in ('servicii', 'produse')),
  autor_angajat_id uuid not null references public.angajati(id),
  autor_nume text,          -- copie la momentul creării
  autor_functie text,
  autor_departament text,   -- se păstrează, nu apare în document
  autor_user_id uuid default auth.uid(), -- cine a creat (poate fi Adminul, în numele altcuiva)
  motiv text not null default '',
  surse jsonb not null default '[]'::jsonb, -- [{id, denumire}] copie a denumirilor alese
  data_intocmirii date not null default current_date,
  stare text not null default 'ciorna' check (stare in ('ciorna', 'trimis', 'aprobat', 'respins', 'anulat')),
  motiv_stare text,
  nr_inregistrare text,     -- doar evidență, nu se tipărește
  data_inregistrare date,
  scan_path text,           -- scanul semnat, în spațiul privat
  semnatari jsonb,          -- copie a semnatarilor la aprobare
  sablon_id uuid references public.fin_sabloane(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fin_referate_autor_idx on public.fin_referate (autor_angajat_id);

create table if not exists public.fin_referate_linii (
  id uuid primary key default gen_random_uuid(),
  referat_id uuid not null references public.fin_referate(id) on delete cascade,
  poz integer not null default 1,
  lista_id uuid references public.fin_liste(id) on delete set null,
  denumire text not null check (length(btrim(denumire)) > 0),
  um text not null check (length(btrim(um)) > 0),
  cantitate numeric(14, 3) not null check (cantitate > 0),
  pret_bani bigint not null check (pret_bani >= 0),
  valoare_bani bigint not null default 0, -- calculat automat
  caracteristici text
);
create index if not exists fin_referate_linii_ref_idx on public.fin_referate_linii (referat_id, poz);

-- -------------------------------------------------------------------------
-- 5. Decontul de cheltuieli
-- -------------------------------------------------------------------------
create table if not exists public.fin_deconturi (
  id uuid primary key default gen_random_uuid(),
  cod text not null unique,
  referat_id uuid not null references public.fin_referate(id) on delete restrict,
  autor_angajat_id uuid not null references public.angajati(id),
  autor_nume text,
  autor_functie text,
  autor_user_id uuid default auth.uid(),
  perioada_de_la date not null,
  perioada_pana date not null,
  deplasare boolean not null default false,
  plecare_data date,
  plecare_ora time,
  sosire_data date,
  sosire_ora time,
  avans_bani bigint not null default 0 check (avans_bani >= 0),
  avans_parcurs_bani bigint not null default 0 check (avans_parcurs_bani >= 0),
  obiective_delegatie text,
  stare text not null default 'ciorna' check (stare in ('ciorna', 'depus', 'verificat', 'anulat')),
  motiv_stare text,
  nr_inregistrare text,
  data_inregistrare date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (perioada_pana >= perioada_de_la)
);
create index if not exists fin_deconturi_referat_idx on public.fin_deconturi (referat_id);
create index if not exists fin_deconturi_autor_idx on public.fin_deconturi (autor_angajat_id);

create table if not exists public.fin_deconturi_linii (
  id uuid primary key default gen_random_uuid(),
  decont_id uuid not null references public.fin_deconturi(id) on delete cascade,
  nr integer not null default 1,
  tip text not null check (tip in ('lista', 'act')),
  lista_id uuid references public.fin_liste(id) on delete set null,
  denumire text not null check (length(btrim(denumire)) > 0), -- "felul actului și emitentul" sau denumirea din listă
  nr_data_act text,        -- doar la "act justificativ"
  cantitate numeric(14, 3),
  pret_bani bigint check (pret_bani is null or pret_bani >= 0),
  suma_bani bigint not null default 0 check (suma_bani >= 0), -- la "listă": calculat; la "act": introdus
  check (
    (tip = 'lista' and cantitate > 0 and pret_bani is not null)
    or (tip = 'act' and nr_data_act is not null and length(btrim(nr_data_act)) > 0)
  )
);
create index if not exists fin_deconturi_linii_dec_idx on public.fin_deconturi_linii (decont_id, nr);

-- -------------------------------------------------------------------------
-- 6. Istoric (cine, ce, când) — scris automat, nu se modifică
-- -------------------------------------------------------------------------
create table if not exists public.fin_istoric (
  id uuid primary key default gen_random_uuid(),
  doc_tip text not null check (doc_tip in ('referat', 'decont')),
  doc_id uuid not null,
  actiune text not null,
  stare text,
  motiv text,
  user_id uuid,
  nume_utilizator text,
  la timestamptz not null default now()
);
create index if not exists fin_istoric_doc_idx on public.fin_istoric (doc_tip, doc_id, la);

create or replace function public.fin_nume_utilizator()
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(g.nume_complet, u.email)
  from auth.users u left join public.angajati g on g.user_id = u.id
  where u.id = auth.uid()
$$;

-- -------------------------------------------------------------------------
-- 7. Funcții ajutătoare pentru accesul la documente
-- -------------------------------------------------------------------------
create or replace function public.fin_referat_al_meu(p_referat uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.fin_referate r
                 where r.id = p_referat and r.autor_angajat_id = public.fin_angajat_id())
$$;

create or replace function public.fin_decont_al_meu(p_decont uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.fin_deconturi d
                 where d.id = p_decont and d.autor_angajat_id = public.fin_angajat_id())
$$;

create or replace function public.fin_stare_referat(p_referat uuid)
returns text language sql stable security definer set search_path = public
as $$ select stare from public.fin_referate where id = p_referat $$;

create or replace function public.fin_stare_decont(p_decont uuid)
returns text language sql stable security definer set search_path = public
as $$ select stare from public.fin_deconturi where id = p_decont $$;

grant execute on function public.fin_referat_al_meu(uuid) to authenticated;
grant execute on function public.fin_decont_al_meu(uuid) to authenticated;

-- Prețul unei linii față de lista prestabilită: fix = exact, plafon = cel mult
create or replace function public.fin_verifica_pret(p_lista uuid, p_pret bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare e record;
begin
  if p_lista is null then return; end if;
  select * into e from public.fin_liste where id = p_lista;
  if not found then return; end if;
  if e.mod_pret = 'fix' and p_pret <> e.pret_bani then
    raise exception 'Prețul pentru „%" este fix: % lei.', e.denumire, to_char(e.pret_bani / 100.0, 'FM999G999G990D00');
  elsif e.mod_pret = 'plafon' and p_pret > e.pret_bani then
    raise exception 'Prețul pentru „%" nu poate depăși plafonul de % lei.', e.denumire, to_char(e.pret_bani / 100.0, 'FM999G999G990D00');
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 8. Reguli automate — REFERAT
-- -------------------------------------------------------------------------
create or replace function public.fin_referate_inainte_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare a record;
begin
  if new.autor_angajat_id is null then
    new.autor_angajat_id := public.fin_angajat_id();
  end if;
  select g.nume_complet, p.name as functie, d.name as departament into a
  from public.angajati g
  left join public.positions p on p.id = g.functie_id
  left join public.departments d on d.id = g.departament_id
  where g.id = new.autor_angajat_id;
  if not found then raise exception 'Autorul nu a fost găsit.'; end if;
  new.autor_nume := a.nume_complet;
  new.autor_functie := a.functie;
  new.autor_departament := a.departament;
  new.cod := public.fin_numar_urmator('referat', 'REF');
  new.stare := 'ciorna';
  new.motiv_stare := null;
  new.nr_inregistrare := null; new.data_inregistrare := null; new.scan_path := null;
  new.semnatari := null; new.sablon_id := null;
  new.autor_user_id := auth.uid();
  new.data_intocmirii := current_date;
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;

drop trigger if exists fin_referate_bi on public.fin_referate;
create trigger fin_referate_bi before insert on public.fin_referate
  for each row execute function public.fin_referate_inainte_insert();

create or replace function public.fin_referate_inainte_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  adm boolean := public.fin_e_admin();
  schimbat boolean;
  s record;
begin
  -- câmpuri care nu se schimbă niciodată
  new.cod := old.cod;
  new.autor_angajat_id := old.autor_angajat_id;
  new.autor_nume := old.autor_nume;
  new.autor_functie := old.autor_functie;
  new.autor_departament := old.autor_departament;
  new.autor_user_id := old.autor_user_id;
  new.data_intocmirii := old.data_intocmirii;
  new.created_at := old.created_at;
  new.updated_at := now();

  if not adm then
    new.nr_inregistrare := old.nr_inregistrare;
    new.data_inregistrare := old.data_inregistrare;
    new.scan_path := old.scan_path;
    new.semnatari := old.semnatari;
    new.sablon_id := old.sablon_id;
    new.motiv_stare := old.motiv_stare;
  end if;

  schimbat := new.stare is distinct from old.stare;

  -- documentele aprobate / anulate nu își mai schimbă conținutul
  if old.stare in ('aprobat', 'anulat') then
    if new.tip is distinct from old.tip or new.motiv is distinct from old.motiv
       or new.surse is distinct from old.surse then
      raise exception 'Referatul % nu mai poate fi modificat.', case old.stare when 'aprobat' then 'aprobat' else 'anulat' end;
    end if;
  end if;

  if schimbat then
    -- tranziții permise
    if not (
      (old.stare = 'ciorna' and new.stare in ('trimis', 'anulat'))
      or (old.stare = 'trimis' and new.stare in ('ciorna', 'anulat'))
      or (old.stare = 'respins' and new.stare = 'ciorna')
      or (adm and old.stare in ('ciorna', 'trimis') and new.stare in ('aprobat', 'respins'))
      or (adm and old.stare = 'aprobat' and new.stare = 'anulat')
    ) then
      raise exception 'Schimbarea stării (% → %) nu este permisă.', old.stare, new.stare;
    end if;

    if new.stare in ('trimis', 'aprobat') then
      if not exists (select 1 from public.fin_referate_linii where referat_id = new.id) then
        raise exception 'Adaugă cel puțin o linie înainte de trimitere.';
      end if;
      if length(btrim(coalesce(new.motiv, ''))) = 0 then
        raise exception 'Completează motivul.';
      end if;
      if jsonb_array_length(coalesce(new.surse, '[]'::jsonb)) = 0 then
        raise exception 'Alege cel puțin o sursă de finanțare.';
      end if;
    end if;

    if new.stare = 'respins' and length(btrim(coalesce(new.motiv_stare, ''))) = 0 then
      raise exception 'Respingerea are nevoie de un motiv.';
    end if;
    if old.stare = 'aprobat' and new.stare = 'anulat' then
      if length(btrim(coalesce(new.motiv_stare, ''))) = 0 then
        raise exception 'Anularea unui referat aprobat are nevoie de un motiv.';
      end if;
      if exists (select 1 from public.fin_deconturi where referat_id = new.id and stare <> 'anulat') then
        raise exception 'Referatul are deconturi active. Anulează întâi deconturile.';
      end if;
    end if;

    if new.stare = 'aprobat' then
      select * into s from public.fin_setari where id = 1;
      new.semnatari := jsonb_build_object(
        'avizat_functie', coalesce(s.avizat_functie, ''), 'avizat_nume', coalesce(s.avizat_nume, ''),
        'aprobat_functie', coalesce(s.aprobat_functie, ''), 'aprobat_nume', coalesce(s.aprobat_nume, ''));
      new.sablon_id := (select id from public.fin_sabloane where modul = 'referat' and activ limit 1);
      new.motiv_stare := null;
    elsif new.stare = 'ciorna' then
      new.motiv_stare := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists fin_referate_bu on public.fin_referate;
create trigger fin_referate_bu before update on public.fin_referate
  for each row execute function public.fin_referate_inainte_update();

create or replace function public.fin_blocheaza_stergerea()
returns trigger language plpgsql
as $$ begin raise exception 'Documentele nu se șterg. Folosește „Anulează".'; end $$;

drop trigger if exists fin_referate_bd on public.fin_referate;
create trigger fin_referate_bd before delete on public.fin_referate
  for each row execute function public.fin_blocheaza_stergerea();
drop trigger if exists fin_deconturi_bd on public.fin_deconturi;
create trigger fin_deconturi_bd before delete on public.fin_deconturi
  for each row execute function public.fin_blocheaza_stergerea();

-- linii de referat: doar cât referatul este ciornă sau trimis
create or replace function public.fin_referate_linii_verifica()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_ref uuid; v_stare text;
begin
  v_ref := coalesce(new.referat_id, old.referat_id);
  v_stare := public.fin_stare_referat(v_ref);
  if v_stare not in ('ciorna', 'trimis') then
    raise exception 'Liniile unui referat % nu se mai pot modifica.', case v_stare when 'aprobat' then 'aprobat' when 'anulat' then 'anulat' else 'respins' end;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.denumire := btrim(new.denumire);
  new.um := btrim(new.um);
  new.valoare_bani := round(new.cantitate * new.pret_bani)::bigint;
  if tg_op = 'INSERT' or new.lista_id is distinct from old.lista_id or new.pret_bani is distinct from old.pret_bani then
    perform public.fin_verifica_pret(new.lista_id, new.pret_bani);
  end if;
  return new;
end $$;

drop trigger if exists fin_referate_linii_biud on public.fin_referate_linii;
create trigger fin_referate_linii_biud before insert or update or delete on public.fin_referate_linii
  for each row execute function public.fin_referate_linii_verifica();

-- -------------------------------------------------------------------------
-- 9. Reguli automate — DECONT
-- -------------------------------------------------------------------------
create or replace function public.fin_deconturi_inainte_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  select * into r from public.fin_referate where id = new.referat_id;
  if not found then raise exception 'Referatul nu a fost găsit.'; end if;
  if r.stare <> 'aprobat' then
    raise exception 'Decontul se poate crea doar pentru un referat aprobat.';
  end if;
  new.autor_angajat_id := r.autor_angajat_id;
  new.autor_nume := r.autor_nume;
  new.autor_functie := r.autor_functie;
  new.cod := public.fin_numar_urmator('decont', 'DEC');
  new.stare := 'ciorna';
  new.motiv_stare := null;
  new.nr_inregistrare := null; new.data_inregistrare := null;
  new.autor_user_id := auth.uid();
  if not new.deplasare then
    new.plecare_data := null; new.plecare_ora := null; new.sosire_data := null; new.sosire_ora := null;
  end if;
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;

drop trigger if exists fin_deconturi_bi on public.fin_deconturi;
create trigger fin_deconturi_bi before insert on public.fin_deconturi
  for each row execute function public.fin_deconturi_inainte_insert();

create or replace function public.fin_deconturi_inainte_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare adm boolean := public.fin_e_admin();
begin
  new.cod := old.cod;
  new.referat_id := old.referat_id;
  new.autor_angajat_id := old.autor_angajat_id;
  new.autor_nume := old.autor_nume;
  new.autor_functie := old.autor_functie;
  new.autor_user_id := old.autor_user_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if not adm then
    new.nr_inregistrare := old.nr_inregistrare;
    new.data_inregistrare := old.data_inregistrare;
    new.motiv_stare := old.motiv_stare;
  end if;
  if not new.deplasare then
    new.plecare_data := null; new.plecare_ora := null; new.sosire_data := null; new.sosire_ora := null;
  end if;

  if old.stare in ('verificat', 'anulat') then
    if new.perioada_de_la is distinct from old.perioada_de_la or new.perioada_pana is distinct from old.perioada_pana
       or new.deplasare is distinct from old.deplasare or new.avans_bani is distinct from old.avans_bani
       or new.avans_parcurs_bani is distinct from old.avans_parcurs_bani
       or new.obiective_delegatie is distinct from old.obiective_delegatie
       or new.plecare_data is distinct from old.plecare_data or new.plecare_ora is distinct from old.plecare_ora
       or new.sosire_data is distinct from old.sosire_data or new.sosire_ora is distinct from old.sosire_ora then
      raise exception 'Decontul % nu mai poate fi modificat.', case old.stare when 'verificat' then 'verificat' else 'anulat' end;
    end if;
  end if;

  if new.stare is distinct from old.stare then
    if not (
      (old.stare = 'ciorna' and new.stare in ('depus', 'anulat'))
      or (old.stare = 'depus' and new.stare in ('ciorna', 'anulat'))
      or (adm and old.stare = 'depus' and new.stare = 'verificat')
      or (adm and old.stare = 'verificat' and new.stare = 'depus')
    ) then
      raise exception 'Schimbarea stării (% → %) nu este permisă.', old.stare, new.stare;
    end if;
    if new.stare = 'depus' and old.stare = 'ciorna'
       and not exists (select 1 from public.fin_deconturi_linii where decont_id = new.id) then
      raise exception 'Adaugă cel puțin o linie în borderou înainte de depunere.';
    end if;
    if old.stare = 'verificat' and length(btrim(coalesce(new.motiv_stare, ''))) = 0 then
      raise exception 'Redeschiderea unui decont verificat are nevoie de un motiv.';
    end if;
    if new.stare in ('ciorna', 'verificat') and old.stare <> 'verificat' then
      new.motiv_stare := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists fin_deconturi_bu on public.fin_deconturi;
create trigger fin_deconturi_bu before update on public.fin_deconturi
  for each row execute function public.fin_deconturi_inainte_update();

create or replace function public.fin_deconturi_linii_verifica()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_dec uuid; v_stare text;
begin
  v_dec := coalesce(new.decont_id, old.decont_id);
  v_stare := public.fin_stare_decont(v_dec);
  if v_stare not in ('ciorna', 'depus') then
    raise exception 'Borderoul unui decont % nu se mai poate modifica.', case v_stare when 'verificat' then 'verificat' else 'anulat' end;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.denumire := btrim(new.denumire);
  if new.tip = 'lista' then
    new.suma_bani := round(new.cantitate * new.pret_bani)::bigint;
    new.nr_data_act := null;
    if tg_op = 'INSERT' or new.lista_id is distinct from old.lista_id or new.pret_bani is distinct from old.pret_bani then
      perform public.fin_verifica_pret(new.lista_id, new.pret_bani);
    end if;
  else
    new.lista_id := null; new.cantitate := null; new.pret_bani := null;
  end if;
  return new;
end $$;

drop trigger if exists fin_deconturi_linii_biud on public.fin_deconturi_linii;
create trigger fin_deconturi_linii_biud before insert or update or delete on public.fin_deconturi_linii
  for each row execute function public.fin_deconturi_linii_verifica();

-- -------------------------------------------------------------------------
-- 10. Istoric automat
-- -------------------------------------------------------------------------
create or replace function public.fin_istoric_referat()
returns trigger language plpgsql security definer set search_path = public
as $$
declare act text;
begin
  if tg_op = 'INSERT' then
    act := 'Creat';
  elsif old.stare is distinct from new.stare then
    act := case new.stare
      when 'trimis' then 'Trimis la aprobare'
      when 'aprobat' then 'Aprobat'
      when 'respins' then 'Respins'
      when 'anulat' then 'Anulat'
      when 'ciorna' then case old.stare when 'respins' then 'Redeschis pentru corectare' else 'Revenit la ciornă' end
    end;
  elsif new.nr_inregistrare is distinct from old.nr_inregistrare or new.data_inregistrare is distinct from old.data_inregistrare then
    act := 'Număr de înregistrare completat';
  elsif new.scan_path is distinct from old.scan_path then
    act := 'Scan semnat încărcat';
  else
    act := 'Modificat';
  end if;
  insert into public.fin_istoric (doc_tip, doc_id, actiune, stare, motiv, user_id, nume_utilizator)
  values ('referat', new.id, act, new.stare, case when tg_op = 'UPDATE' then new.motiv_stare end,
          auth.uid(), public.fin_nume_utilizator());
  return new;
end $$;

drop trigger if exists fin_referate_ai on public.fin_referate;
create trigger fin_referate_ai after insert or update on public.fin_referate
  for each row execute function public.fin_istoric_referat();

create or replace function public.fin_istoric_decont()
returns trigger language plpgsql security definer set search_path = public
as $$
declare act text;
begin
  if tg_op = 'INSERT' then
    act := 'Creat';
  elsif old.stare is distinct from new.stare then
    act := case new.stare
      when 'depus' then case old.stare when 'verificat' then 'Redeschis' else 'Depus' end
      when 'verificat' then 'Verificat'
      when 'anulat' then 'Anulat'
      when 'ciorna' then 'Revenit la ciornă'
    end;
  elsif new.nr_inregistrare is distinct from old.nr_inregistrare or new.data_inregistrare is distinct from old.data_inregistrare then
    act := 'Număr de înregistrare completat';
  else
    act := 'Modificat';
  end if;
  insert into public.fin_istoric (doc_tip, doc_id, actiune, stare, motiv, user_id, nume_utilizator)
  values ('decont', new.id, act, new.stare, case when tg_op = 'UPDATE' then new.motiv_stare end,
          auth.uid(), public.fin_nume_utilizator());
  return new;
end $$;

drop trigger if exists fin_deconturi_ai on public.fin_deconturi;
create trigger fin_deconturi_ai after insert or update on public.fin_deconturi
  for each row execute function public.fin_istoric_decont();

-- -------------------------------------------------------------------------
-- 11. Funcții utile pentru aplicație
-- -------------------------------------------------------------------------
-- Cât s-a cheltuit în deconturile active ale unui referat (în bani)
create or replace function public.fin_referat_cheltuit(p_referat uuid)
returns bigint language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.fin_e_admin() or public.fin_referat_al_meu(p_referat)) then
    raise exception 'Fără acces.';
  end if;
  return coalesce((
    select sum(l.suma_bani) from public.fin_deconturi d
    join public.fin_deconturi_linii l on l.decont_id = d.id
    where d.referat_id = p_referat and d.stare <> 'anulat'
  ), 0);
end $$;
grant execute on function public.fin_referat_cheltuit(uuid) to authenticated;

-- Sexul autorului (din HR) pentru "Subsemnatul/Subsemnata". Doar autorul sau adminul.
create or replace function public.fin_sex_angajat(p_angajat uuid)
returns text language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.fin_e_admin() or p_angajat = public.fin_angajat_id()) then
    raise exception 'Fără acces.';
  end if;
  return (select sex from public.hr_profil_angajat where angajat_id = p_angajat);
end $$;
grant execute on function public.fin_sex_angajat(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- 12. Reguli de acces (RLS)
-- -------------------------------------------------------------------------
alter table public.fin_um enable row level security;
alter table public.fin_surse enable row level security;
alter table public.fin_setari enable row level security;
alter table public.fin_liste enable row level security;
alter table public.fin_sabloane enable row level security;
alter table public.fin_contoare enable row level security;
alter table public.fin_referate enable row level security;
alter table public.fin_referate_linii enable row level security;
alter table public.fin_deconturi enable row level security;
alter table public.fin_deconturi_linii enable row level security;
alter table public.fin_istoric enable row level security;

-- setări și liste: le citește oricine are acces, le scrie doar adminul
do $$
declare t text;
begin
  foreach t in array array['fin_um', 'fin_surse', 'fin_setari', 'fin_liste'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select using (public.fin_are_acces())', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all using (public.fin_e_admin()) with check (public.fin_e_admin())', t || '_write', t);
  end loop;
end $$;

drop policy if exists fin_sabloane_select on public.fin_sabloane;
create policy fin_sabloane_select on public.fin_sabloane for select using (public.fin_are_acces());
drop policy if exists fin_sabloane_insert on public.fin_sabloane;
create policy fin_sabloane_insert on public.fin_sabloane for insert with check (public.fin_e_admin());
drop policy if exists fin_sabloane_update on public.fin_sabloane;
create policy fin_sabloane_update on public.fin_sabloane for update using (public.fin_e_admin()) with check (public.fin_e_admin());

-- referate
drop policy if exists fin_referate_select on public.fin_referate;
create policy fin_referate_select on public.fin_referate for select
  using (public.fin_e_admin() or autor_angajat_id = public.fin_angajat_id());

drop policy if exists fin_referate_insert on public.fin_referate;
create policy fin_referate_insert on public.fin_referate for insert
  with check (
    public.fin_e_admin()
    or (public.fin_are_acces() and autor_angajat_id = public.fin_angajat_id())
  );

drop policy if exists fin_referate_update on public.fin_referate;
create policy fin_referate_update on public.fin_referate for update
  using (public.fin_e_admin() or autor_angajat_id = public.fin_angajat_id())
  with check (public.fin_e_admin() or autor_angajat_id = public.fin_angajat_id());
-- (fără politică de ștergere: documentele nu se șterg)

drop policy if exists fin_referate_linii_select on public.fin_referate_linii;
create policy fin_referate_linii_select on public.fin_referate_linii for select
  using (public.fin_e_admin() or public.fin_referat_al_meu(referat_id));
drop policy if exists fin_referate_linii_write on public.fin_referate_linii;
create policy fin_referate_linii_write on public.fin_referate_linii for all
  using (public.fin_e_admin() or public.fin_referat_al_meu(referat_id))
  with check (public.fin_e_admin() or public.fin_referat_al_meu(referat_id));

-- deconturi
drop policy if exists fin_deconturi_select on public.fin_deconturi;
create policy fin_deconturi_select on public.fin_deconturi for select
  using (public.fin_e_admin() or autor_angajat_id = public.fin_angajat_id());

drop policy if exists fin_deconturi_insert on public.fin_deconturi;
create policy fin_deconturi_insert on public.fin_deconturi for insert
  with check (public.fin_e_admin() or (public.fin_are_acces() and public.fin_referat_al_meu(referat_id)));

drop policy if exists fin_deconturi_update on public.fin_deconturi;
create policy fin_deconturi_update on public.fin_deconturi for update
  using (public.fin_e_admin() or autor_angajat_id = public.fin_angajat_id())
  with check (public.fin_e_admin() or autor_angajat_id = public.fin_angajat_id());

drop policy if exists fin_deconturi_linii_select on public.fin_deconturi_linii;
create policy fin_deconturi_linii_select on public.fin_deconturi_linii for select
  using (public.fin_e_admin() or public.fin_decont_al_meu(decont_id));
drop policy if exists fin_deconturi_linii_write on public.fin_deconturi_linii;
create policy fin_deconturi_linii_write on public.fin_deconturi_linii for all
  using (public.fin_e_admin() or public.fin_decont_al_meu(decont_id))
  with check (public.fin_e_admin() or public.fin_decont_al_meu(decont_id));

-- istoric: doar citire, pentru cine vede documentul
drop policy if exists fin_istoric_select on public.fin_istoric;
create policy fin_istoric_select on public.fin_istoric for select
  using (
    public.fin_e_admin()
    or (doc_tip = 'referat' and public.fin_referat_al_meu(doc_id))
    or (doc_tip = 'decont' and public.fin_decont_al_meu(doc_id))
  );

-- -------------------------------------------------------------------------
-- 13. Spațiu privat pentru scanurile semnate (doar adminii)
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('financiar-scanuri', 'financiar-scanuri', false)
on conflict (id) do nothing;

drop policy if exists "financiar_scanuri_admin" on storage.objects;
create policy "financiar_scanuri_admin" on storage.objects for all
  using (bucket_id = 'financiar-scanuri' and public.fin_e_admin())
  with check (bucket_id = 'financiar-scanuri' and public.fin_e_admin());

-- -------------------------------------------------------------------------
-- 14. Date de pornire (le poți schimba oricând din aplicație)
-- -------------------------------------------------------------------------
insert into public.fin_um (denumire, ordine) values
  ('buc', 1), ('perechi', 2), ('set', 3), ('metru', 4), ('cutie', 5),
  ('litri', 6), ('nr. de zile', 7), ('nr. de nopți', 8)
on conflict do nothing;

insert into public.fin_surse (denumire, ordine) values
  ('venituri proprii', 1), ('bugetul statului', 2)
on conflict do nothing;

insert into public.fin_setari (id, avizat_functie, avizat_nume, aprobat_functie, aprobat_nume)
values (1, 'Contabil Șef', 'Elena Cursaru', 'Manager Interimar', 'Emil PANTELIMON')
on conflict (id) do nothing;

insert into public.fin_liste (denumire, um, pret_bani, mod_pret, tip, valabil_de_la)
select v.* from (values
  ('Indemnizație de deplasare', 'nr. de zile', 2300::bigint, 'fix', 'servicii', date '2026-01-01'),
  ('Indemnizație de cazare', 'nr. de nopți', 26500::bigint, 'fix', 'servicii', date '2026-01-01')
) as v(denumire, um, pret_bani, mod_pret, tip, valabil_de_la)
where not exists (select 1 from public.fin_liste);

-- -------------------------------------------------------------------------
-- 15. Rolul "Angajat" în Financiar pentru toți angajații activi care au cont
--     (poți schimba oricând din Hub → Administrare → Acces tool-uri;
--      acolo îi dai rolul "admin_financiar" contabilului-șef etc.)
-- -------------------------------------------------------------------------
insert into public.acces_tooluri (angajat_id, tool, rol)
select g.id, 'financiar', 'angajat'
from public.angajati g
where g.activ and g.user_id is not null
on conflict (angajat_id, tool) do nothing;

-- Verificare rapidă (opțional):
-- select rol, count(*) from public.acces_tooluri where tool = 'financiar' group by rol;
