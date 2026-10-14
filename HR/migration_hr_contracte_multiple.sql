-- =========================================================================
-- HR — CONTRACTE MULTIPLE (pas 1 din proiectul Rapoarte)
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- Rulează O SINGURĂ DATĂ, în SQL Editor, ÎNAINTE de a încărca noua versiune
-- a aplicației HR. Scriptul poate fi rulat și a doua oară fără pagube
-- (verifică ce există deja), dar nu e nevoie.
--
-- Ce face:
--   0. Rezervă: copiază datele actuale în tabele de siguranță.
--   1. Adaugă "sex" în hr_profil_angajat (date personale).
--   2. Creează tabela hr_contracte (un rând = un contract) și copiază în ea
--      contractul actual al fiecărui angajat, marcat ca "principal".
--   3. Oglindește pe hr_contracte regulile de acces (RLS) ale lui
--      hr_profil_angajat, ca să vadă/scrie aceiași oameni ca până acum.
--   4. Adaugă hr_acte_aditionale.contract_id (la ce contract se aplică).
--   5. Convertește leave_requests.deduction la formatul pe contracte.
--   6. Funcții: seteaza_contract_principal(), rollover_hr_contracte().
--
-- NU șterge nimic: coloanele vechi de contract din hr_profil_angajat rămân
-- (nefolosite de aplicație) ca să se poată reveni.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. Rezervă (se creează o singură dată; dacă există, nu se atinge)
-- -------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.backup_hr_profil_angajat_pre_contracte') is null then
    execute 'create table public.backup_hr_profil_angajat_pre_contracte as select * from public.hr_profil_angajat';
  end if;
  if to_regclass('public.backup_leave_requests_pre_contracte') is null then
    execute 'create table public.backup_leave_requests_pre_contracte as select * from public.leave_requests';
  end if;
  if to_regclass('public.backup_hr_acte_aditionale_pre_contracte') is null then
    execute 'create table public.backup_hr_acte_aditionale_pre_contracte as select * from public.hr_acte_aditionale';
  end if;
end $$;

-- Tabelele de rezervă nu trebuie să fie vizibile din aplicație.
alter table public.backup_hr_profil_angajat_pre_contracte enable row level security;
alter table public.backup_leave_requests_pre_contracte enable row level security;
alter table public.backup_hr_acte_aditionale_pre_contracte enable row level security;

-- -------------------------------------------------------------------------
-- 1. Sexul angajatului (date personale; pentru "Subsemnatul/Subsemnata")
-- -------------------------------------------------------------------------
alter table public.hr_profil_angajat
  add column if not exists sex text;

alter table public.hr_profil_angajat
  drop constraint if exists hr_profil_angajat_sex_check;
alter table public.hr_profil_angajat
  add constraint hr_profil_angajat_sex_check check (sex is null or sex in ('M', 'F'));

-- -------------------------------------------------------------------------
-- 2. Tabela hr_contracte
--    departament_id / functie_id: lăsate NULL la contractul principal (el
--    folosește departamentul și funcția din Hub, de pe angajat). Un contract
--    secundar are propriile valori.
-- -------------------------------------------------------------------------
create table if not exists public.hr_contracte (
  id uuid primary key default gen_random_uuid(),
  angajat_id uuid not null references public.angajati(id) on delete cascade,
  este_principal boolean not null default false,

  numar_contract text,
  data_inceput_contract date,
  tip_contract text,
  data_final_contract date,
  grad text,
  atributie_id uuid,
  departament_id uuid,
  functie_id uuid,
  norma_ore smallint,
  interval_ora_inceput time,
  interval_ora_sfarsit time,
  are_fisa_postului boolean,
  functie_de_baza boolean,

  zile_concediu_baza_an numeric not null default 21,
  sold_an_minus_2 numeric not null default 0,
  sold_an_minus_1 numeric not null default 0,
  sold_an_curent numeric not null default 0,
  an_referinta integer not null default extract(year from now())::int,

  created_at timestamptz not null default now()
);

create index if not exists hr_contracte_angajat_idx on public.hr_contracte (angajat_id);

-- Cel mult un contract principal pe angajat.
create unique index if not exists hr_contracte_un_principal_idx
  on public.hr_contracte (angajat_id) where este_principal;

-- Copiază contractul actual al fiecărui angajat (o singură dată).
insert into public.hr_contracte (
  angajat_id, este_principal, numar_contract, data_inceput_contract, tip_contract,
  data_final_contract, grad, atributie_id, norma_ore, interval_ora_inceput,
  interval_ora_sfarsit, are_fisa_postului, functie_de_baza, zile_concediu_baza_an,
  sold_an_minus_2, sold_an_minus_1, sold_an_curent, an_referinta
)
select
  p.angajat_id, true, p.numar_contract, p.data_inceput_contract, p.tip_contract,
  p.data_final_contract, p.grad, p.atributie_id, p.norma_ore, p.interval_ora_inceput,
  p.interval_ora_sfarsit, p.are_fisa_postului, p.functie_de_baza, p.zile_concediu_baza_an,
  p.sold_an_minus_2, p.sold_an_minus_1, p.sold_an_curent, p.an_referinta
from public.hr_profil_angajat p
where not exists (select 1 from public.hr_contracte c where c.angajat_id = p.angajat_id);

-- -------------------------------------------------------------------------
-- 3. Reguli de acces: oglindesc exact politicile lui hr_profil_angajat
--    (aceiași oameni care vedeau/scriau profilul HR văd/scriu contractele).
-- -------------------------------------------------------------------------
do $$
declare
  rls_activ boolean;
  pol record;
  cmd_sql text;
  roluri text;
  stmt text;
begin
  select relrowsecurity into rls_activ
  from pg_class where oid = 'public.hr_profil_angajat'::regclass;

  if coalesce(rls_activ, false) then
    execute 'alter table public.hr_contracte enable row level security';

    for pol in
      select * from pg_policies
      where schemaname = 'public' and tablename = 'hr_profil_angajat'
    loop
      execute format('drop policy if exists %I on public.hr_contracte', pol.policyname);

      roluri := array_to_string(pol.roles, ', ');
      cmd_sql := case pol.cmd when 'ALL' then 'ALL' else pol.cmd end;

      stmt := format(
        'create policy %I on public.hr_contracte as %s for %s to %s',
        pol.policyname, pol.permissive, cmd_sql, roluri
      );
      if pol.qual is not null then
        stmt := stmt || ' using (' || pol.qual || ')';
      end if;
      if pol.with_check is not null then
        stmt := stmt || ' with check (' || pol.with_check || ')';
      end if;
      execute stmt;
    end loop;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 4. Actele adiționale știu acum la ce contract se aplică
-- -------------------------------------------------------------------------
alter table public.hr_acte_aditionale
  add column if not exists contract_id uuid references public.hr_contracte(id) on delete set null;

-- Actele vechi se leagă de contractul principal al angajatului.
update public.hr_acte_aditionale a
set contract_id = c.id
from public.hr_contracte c
where a.contract_id is null
  and c.angajat_id = a.angajat_id
  and c.este_principal;

-- -------------------------------------------------------------------------
-- 5. leave_requests.deduction — format nou, pe contracte:
--      { "recoveries": 2, "contracte": { "<id contract>": { "2025": 1, "2026": 2 } } }
--    Cererile vechi (cheile-an direct în obiect) se mută sub contractul
--    principal al angajatului. Cererile fără scădere ({}) rămân neatinse.
-- -------------------------------------------------------------------------
update public.leave_requests r
set deduction = jsonb_build_object(
      'recoveries', coalesce(r.deduction -> 'recoveries', '0'::jsonb),
      'contracte', jsonb_build_object(
        c.id::text,
        coalesce(
          (select jsonb_object_agg(e.key, e.value)
           from jsonb_each(r.deduction) e
           where e.key <> 'recoveries' and e.key ~ '^[0-9]{4}$'),
          '{}'::jsonb
        )
      )
    )
from public.hr_contracte c
where c.angajat_id = r.angajat_id
  and c.este_principal
  and r.deduction is not null
  and r.deduction <> '{}'::jsonb
  and not (r.deduction ? 'contracte');

-- -------------------------------------------------------------------------
-- 6. Funcții
--    Rulează cu drepturile utilizatorului (nu "security definer"), deci
--    regulile de acces de mai sus se aplică: un angajat obișnuit nu poate
--    schimba nimic prin ele.
-- -------------------------------------------------------------------------

-- Setează un contract ca principal (și îl scoate pe cel vechi). Schimbul de
-- departament/funcție dintre cele două contracte se face aici, ca angajatul
-- (Hub) să afișeze mereu datele contractului principal.
create or replace function public.seteaza_contract_principal(p_contract uuid)
returns void
language plpgsql
as $$
declare
  nou record;
  vechi record;
  ang record;
begin
  select * into nou from public.hr_contracte where id = p_contract;
  if not found then
    raise exception 'Contractul nu există.';
  end if;
  if nou.este_principal then
    return;
  end if;

  select * into ang from public.angajati where id = nou.angajat_id;
  select * into vechi from public.hr_contracte
    where angajat_id = nou.angajat_id and este_principal;

  -- vechiul principal păstrează departamentul/funcția pe care le avea din Hub
  if found then
    update public.hr_contracte
    set este_principal = false,
        departament_id = ang.departament_id,
        functie_id = ang.functie_id
    where id = vechi.id;
  end if;

  -- noul principal trece pe departamentul/funcția lui (dacă le avea) și le
  -- mută pe angajat
  update public.hr_contracte
  set este_principal = true,
      departament_id = null,
      functie_id = null
  where id = nou.id;

  update public.angajati
  set departament_id = coalesce(nou.departament_id, departament_id),
      functie_id = coalesce(nou.functie_id, functie_id)
  where id = nou.angajat_id;
end;
$$;

grant execute on function public.seteaza_contract_principal(uuid) to authenticated;

-- Butonul "Trece la anul nou": avansează soldurile TUTUROR contractelor.
-- (Recuperările sunt la persoană și nu sunt afectate.)
create or replace function public.rollover_hr_contracte()
returns void
language plpgsql
as $$
declare
  nr integer;
begin
  loop
    update public.hr_contracte
    set
      sold_an_minus_2 = sold_an_minus_1,
      sold_an_minus_1 = sold_an_curent,
      sold_an_curent = zile_concediu_baza_an,
      an_referinta = an_referinta + 1
    where an_referinta < extract(year from now())::int;

    get diagnostics nr = row_count;
    -- 0 rânduri = totul e la zi, SAU utilizatorul nu are drept de scriere
    -- (regulile de acces nu l-au lăsat) — în ambele cazuri ne oprim.
    exit when nr = 0;
  end loop;
end;
$$;

grant execute on function public.rollover_hr_contracte() to authenticated;

-- -------------------------------------------------------------------------
-- Verificare rapidă (opțional): ar trebui să vezi câte un contract
-- principal pentru fiecare angajat care avea profil HR.
-- -------------------------------------------------------------------------
-- select (select count(*) from hr_profil_angajat) as profile,
--        (select count(*) from hr_contracte where este_principal) as contracte_principale;
