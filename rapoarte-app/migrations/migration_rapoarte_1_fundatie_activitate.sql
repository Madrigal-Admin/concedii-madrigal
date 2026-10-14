-- =========================================================================
-- RAPOARTE — Migrarea 1: fundația + Modulul A (Raport de activitate lunară)
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- Rulează O SINGURĂ DATĂ, în SQL Editor, ÎNAINTE de a încărca aplicația.
-- (Dacă apare pop-up-ul cu "Potential issues", alege "Run and enable RLS".)
-- Scriptul poate fi rulat și a doua oară fără pagube.
--
-- Ce face:
--   1. Adaugă "rapoarte" în lista de tool-uri permise din acces_tooluri.
--   2. Funcții de rol: cine este admin general / de activitate etc.
--   3. Tabele: persoane, contracte, rapoarte de activitate, istoric,
--      șabloane Word, câmpuri adăugate de Admin general.
--   4. Reguli de acces (RLS): fiecare își vede doar ce are voie.
--   5. Reguli automate (trigger): raport doar pentru luni încheiate,
--      marcaj "cu întârziere", istoric automat, rapoartele nu se șterg.
--   6. Funcții utile: perioade disponibile, "cine nu a depus", sexul
--      persoanei (din HR), contractele din HR.
--   7. Dă automat rolul "Angajat" în Rapoarte tuturor angajaților activi
--      care au cont.
-- NU modifică și nu șterge nimic din HR sau din celelalte tool-uri.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. "rapoarte" devine tool permis în acces_tooluri
-- -------------------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.acces_tooluri'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%tool%'
  loop
    execute format('alter table public.acces_tooluri drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.acces_tooluri
  add constraint acces_tooluri_tool_check
  check (tool in ('hub', 'hr', 'invitatii', 'administrativ', 'calendar', 'rapoarte'));

-- -------------------------------------------------------------------------
-- 2. Funcții de rol (rulează cu drepturi de sistem, ca să poată citi
--    acces_tooluri indiferent de cine întreabă)
--    Roluri în Rapoarte: admin_general, admin_activitate, admin_postev,
--    angajat, vizualizare. Adminul Hub = admin_general peste tot.
-- -------------------------------------------------------------------------
create or replace function public.rap_angajat_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.angajati where user_id = auth.uid() limit 1
$$;

create or replace function public.rap_rol()
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when public.is_hub_admin() then 'admin_general'
    else (
      select a.rol
      from public.acces_tooluri a
      join public.angajati g on g.id = a.angajat_id
      where g.user_id = auth.uid() and a.tool = 'rapoarte'
      limit 1
    )
  end
$$;

create or replace function public.rap_e_admin_activitate()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.rap_rol() in ('admin_general', 'admin_activitate'), false) $$;

create or replace function public.rap_e_admin_general()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.rap_rol() = 'admin_general', false) $$;

create or replace function public.rap_are_acces()
returns boolean language sql stable security definer set search_path = public
as $$ select public.rap_rol() is not null $$;

grant execute on function public.rap_angajat_id() to authenticated;
grant execute on function public.rap_rol() to authenticated;
grant execute on function public.rap_e_admin_activitate() to authenticated;
grant execute on function public.rap_e_admin_general() to authenticated;
grant execute on function public.rap_are_acces() to authenticated;

-- -------------------------------------------------------------------------
-- 3. Tabele
-- -------------------------------------------------------------------------

-- 3a. Persoane (angajați din Hub sau colaboratori externi)
create table if not exists public.rap_persoane (
  id uuid primary key default gen_random_uuid(),
  tip text not null check (tip in ('angajat', 'extern')),
  angajat_id uuid unique references public.angajati(id) on delete restrict,
  nume text not null,
  email text,
  sex text check (sex is null or sex in ('M', 'F')), -- doar pentru externi; la angajați vine din HR
  activ boolean not null default true,
  created_at timestamptz not null default now(),
  check ((tip = 'angajat' and angajat_id is not null) or (tip = 'extern' and angajat_id is null))
);

-- 3b. Contracte (un contract = o persoană pe un obiect, cu perioadă de valabilitate)
create table if not exists public.rap_contracte (
  id uuid primary key default gen_random_uuid(),
  persoana_id uuid not null references public.rap_persoane(id) on delete restrict,
  numar_contract text not null,
  tip text not null check (tip in ('CIM', 'colaborare')),
  departament text,
  obiect text not null,
  valabil_de_la date not null,
  valabil_pana date, -- gol = fără dată de final
  hr_contract_id uuid references public.hr_contracte(id) on delete set null,
  activ boolean not null default true,
  created_at timestamptz not null default now(),
  check (valabil_pana is null or valabil_pana >= valabil_de_la)
);
create index if not exists rap_contracte_persoana_idx on public.rap_contracte (persoana_id);

-- 3c. Șabloane Word (versiuni păstrate; una singură activă)
create table if not exists public.rap_sabloane (
  id uuid primary key default gen_random_uuid(),
  modul text not null default 'activitate' check (modul in ('activitate', 'postev')),
  versiune integer not null,
  nume_fisier text not null,
  continut_base64 text not null,
  markeri jsonb not null default '[]'::jsonb,
  activ boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (modul, versiune)
);
create unique index if not exists rap_sabloane_un_activ_idx
  on public.rap_sabloane (modul) where activ;

-- 3d. Câmpuri adăugate de Admin general (motorul de formulare)
create table if not exists public.rap_campuri (
  id uuid primary key default gen_random_uuid(),
  modul text not null check (modul in ('activitate', 'postev')),
  cod text not null,
  eticheta text not null,
  tip text not null check (tip in ('text', 'text_lung', 'numar', 'data', 'da_nu', 'alegere')),
  optiuni jsonb not null default '[]'::jsonb,
  obligatoriu boolean not null default false,
  marker text, -- marker din șablonul Word (fără acolade)
  ajutor text,
  ordine integer not null default 0,
  activ boolean not null default true,
  created_at timestamptz not null default now(),
  unique (modul, cod)
);

-- 3e. Rapoartele de activitate (un raport = un contract × o lună)
create table if not exists public.rap_activitate (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rap_contracte(id) on delete restrict,
  luna smallint not null check (luna between 1 and 12),
  an smallint not null check (an between 2020 and 2100),
  activitati text not null check (length(btrim(activitati)) > 0),
  extra jsonb not null default '{}'::jsonb,
  stare text not null default 'trimis' check (stare in ('trimis', 'in_verificare', 'aprobat', 'respins')),
  motiv_stare text,
  cu_intarziere boolean not null default false,
  sablon_id uuid references public.rap_sabloane(id),
  autor_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(), -- data completării
  updated_at timestamptz not null default now(),
  unique (contract_id, luna, an)
);
create index if not exists rap_activitate_contract_idx on public.rap_activitate (contract_id);

-- 3f. Istoric (cine, ce, când) — se scrie automat și nu se modifică
create table if not exists public.rap_istoric (
  id uuid primary key default gen_random_uuid(),
  raport_id uuid not null references public.rap_activitate(id) on delete restrict,
  actiune text not null,
  stare text,
  motiv text,
  user_id uuid,
  nume_utilizator text,
  la timestamptz not null default now()
);
create index if not exists rap_istoric_raport_idx on public.rap_istoric (raport_id);

-- -------------------------------------------------------------------------
-- 4. Funcții ajutătoare pentru reguli de acces
-- -------------------------------------------------------------------------
create or replace function public.rap_persoana_mea(p_persoana uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.rap_persoane p
    where p.id = p_persoana and p.angajat_id is not null and p.angajat_id = public.rap_angajat_id()
  )
$$;

create or replace function public.rap_contract_al_meu(p_contract uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.rap_contracte c
    where c.id = p_contract and public.rap_persoana_mea(c.persoana_id)
  )
$$;

create or replace function public.rap_raport_al_meu(p_raport uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.rap_activitate r
    where r.id = p_raport and public.rap_contract_al_meu(r.contract_id)
  )
$$;

grant execute on function public.rap_persoana_mea(uuid) to authenticated;
grant execute on function public.rap_contract_al_meu(uuid) to authenticated;
grant execute on function public.rap_raport_al_meu(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- 5. Reguli de acces (RLS)
-- -------------------------------------------------------------------------
alter table public.rap_persoane enable row level security;
alter table public.rap_contracte enable row level security;
alter table public.rap_sabloane enable row level security;
alter table public.rap_campuri enable row level security;
alter table public.rap_activitate enable row level security;
alter table public.rap_istoric enable row level security;

-- persoane
drop policy if exists rap_persoane_select on public.rap_persoane;
create policy rap_persoane_select on public.rap_persoane for select
  using (public.rap_e_admin_activitate() or public.rap_persoana_mea(id));
drop policy if exists rap_persoane_write on public.rap_persoane;
create policy rap_persoane_write on public.rap_persoane for all
  using (public.rap_e_admin_activitate()) with check (public.rap_e_admin_activitate());

-- contracte
drop policy if exists rap_contracte_select on public.rap_contracte;
create policy rap_contracte_select on public.rap_contracte for select
  using (public.rap_e_admin_activitate() or public.rap_persoana_mea(persoana_id));
drop policy if exists rap_contracte_write on public.rap_contracte;
create policy rap_contracte_write on public.rap_contracte for all
  using (public.rap_e_admin_activitate()) with check (public.rap_e_admin_activitate());

-- șabloane: toți cei cu acces în Rapoarte le citesc (pentru descărcare); scrie doar Admin general
drop policy if exists rap_sabloane_select on public.rap_sabloane;
create policy rap_sabloane_select on public.rap_sabloane for select
  using (public.rap_are_acces());
drop policy if exists rap_sabloane_insert on public.rap_sabloane;
create policy rap_sabloane_insert on public.rap_sabloane for insert
  with check (public.rap_e_admin_general());
drop policy if exists rap_sabloane_update on public.rap_sabloane;
create policy rap_sabloane_update on public.rap_sabloane for update
  using (public.rap_e_admin_general()) with check (public.rap_e_admin_general());

-- câmpuri
drop policy if exists rap_campuri_select on public.rap_campuri;
create policy rap_campuri_select on public.rap_campuri for select
  using (public.rap_are_acces());
drop policy if exists rap_campuri_write on public.rap_campuri;
create policy rap_campuri_write on public.rap_campuri for all
  using (public.rap_e_admin_general()) with check (public.rap_e_admin_general());

-- rapoarte de activitate
drop policy if exists rap_activitate_select on public.rap_activitate;
create policy rap_activitate_select on public.rap_activitate for select
  using (public.rap_e_admin_activitate() or public.rap_contract_al_meu(contract_id));

drop policy if exists rap_activitate_insert on public.rap_activitate;
create policy rap_activitate_insert on public.rap_activitate for insert
  with check (
    stare = 'trimis'
    and (public.rap_e_admin_activitate() or public.rap_contract_al_meu(contract_id))
  );

-- autorul își poate corecta raportul doar cât e "trimis" sau "respins"
drop policy if exists rap_activitate_update on public.rap_activitate;
create policy rap_activitate_update on public.rap_activitate for update
  using (
    public.rap_e_admin_activitate()
    or (public.rap_contract_al_meu(contract_id) and stare in ('trimis', 'respins'))
  )
  with check (
    public.rap_e_admin_activitate()
    or (public.rap_contract_al_meu(contract_id) and stare = 'trimis')
  );
-- (fără politică de ștergere: rapoartele nu se șterg niciodată)

-- istoric: doar citire
drop policy if exists rap_istoric_select on public.rap_istoric;
create policy rap_istoric_select on public.rap_istoric for select
  using (public.rap_e_admin_activitate() or public.rap_raport_al_meu(raport_id));

-- -------------------------------------------------------------------------
-- 6. Reguli automate pe rapoarte
-- -------------------------------------------------------------------------

-- 6a. La salvare (inserare): luna trebuie să fie încheiată și în valabilitatea
--     contractului; se marchează "cu întârziere" dacă s-a depus după 5 a lunii următoare.
create or replace function public.rap_activitate_inainte_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  c record;
  inceput_luna date := make_date(new.an, new.luna, 1);
  sfarsit_luna date := (make_date(new.an, new.luna, 1) + interval '1 month' - interval '1 day')::date;
  termen date := (make_date(new.an, new.luna, 1) + interval '1 month' + interval '4 days')::date;
begin
  select * into c from public.rap_contracte where id = new.contract_id;
  if not found or not c.activ then
    raise exception 'Contractul nu este activ.';
  end if;
  if sfarsit_luna >= current_date then
    raise exception 'Raportul se poate depune doar pentru luni încheiate.';
  end if;
  if c.valabil_de_la > sfarsit_luna or (c.valabil_pana is not null and c.valabil_pana < inceput_luna) then
    raise exception 'Luna aleasă nu face parte din perioada de valabilitate a contractului.';
  end if;
  new.stare := 'trimis';
  new.cu_intarziere := current_date > termen;
  new.autor_user_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists rap_activitate_bi on public.rap_activitate;
create trigger rap_activitate_bi before insert on public.rap_activitate
  for each row execute function public.rap_activitate_inainte_insert();

-- 6b. La modificare: autorul nu poate schimba contractul, luna, marcajul
--     sau starea înafară de retrimitere; adminul trebuie să dea motiv la
--     respingere / redeschidere; la aprobare se reține versiunea șablonului.
create or replace function public.rap_activitate_inainte_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare activ_id uuid;
begin
  new.contract_id := old.contract_id;
  new.luna := old.luna;
  new.an := old.an;
  new.cu_intarziere := old.cu_intarziere;
  new.autor_user_id := old.autor_user_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if not public.rap_e_admin_activitate() then
    -- autor: poate doar corecta textul; raportul revine la "trimis"
    new.stare := 'trimis';
    new.motiv_stare := old.motiv_stare;
    new.sablon_id := old.sablon_id;
    return new;
  end if;

  if new.stare = 'respins' and coalesce(btrim(new.motiv_stare), '') = '' then
    raise exception 'Respingerea are nevoie de un motiv.';
  end if;
  if old.stare = 'aprobat' and new.stare <> 'aprobat' and coalesce(btrim(new.motiv_stare), '') = '' then
    raise exception 'Redeschiderea unui raport aprobat are nevoie de un motiv.';
  end if;
  if new.stare = 'aprobat' and old.stare <> 'aprobat' then
    select id into activ_id from public.rap_sabloane where modul = 'activitate' and activ limit 1;
    new.sablon_id := coalesce(old.sablon_id, activ_id);
    new.motiv_stare := null;
  end if;
  return new;
end $$;

drop trigger if exists rap_activitate_bu on public.rap_activitate;
create trigger rap_activitate_bu before update on public.rap_activitate
  for each row execute function public.rap_activitate_inainte_update();

-- 6c. Rapoartele nu se șterg
create or replace function public.rap_blocheaza_stergerea()
returns trigger language plpgsql
as $$ begin raise exception 'Rapoartele nu se pot șterge.'; end $$;

drop trigger if exists rap_activitate_bd on public.rap_activitate;
create trigger rap_activitate_bd before delete on public.rap_activitate
  for each row execute function public.rap_blocheaza_stergerea();

-- 6d. Istoricul se scrie automat
create or replace function public.rap_activitate_istoric()
returns trigger language plpgsql security definer set search_path = public
as $$
declare nume text; act text;
begin
  select coalesce(g.nume_complet, u.email) into nume
  from auth.users u left join public.angajati g on g.user_id = u.id
  where u.id = auth.uid();

  if tg_op = 'INSERT' then
    act := 'Depus' || case when new.cu_intarziere then ' (cu întârziere)' else '' end;
  elsif old.stare is distinct from new.stare then
    act := case new.stare
      when 'trimis' then 'Retrimis'
      when 'in_verificare' then case when old.stare = 'aprobat' then 'Redeschis' else 'Preluat în verificare' end
      when 'aprobat' then 'Aprobat'
      when 'respins' then 'Respins'
    end;
  else
    act := 'Text modificat';
  end if;

  insert into public.rap_istoric (raport_id, actiune, stare, motiv, user_id, nume_utilizator)
  values (new.id, act, new.stare, case when tg_op = 'UPDATE' then new.motiv_stare end, auth.uid(), nume);
  return new;
end $$;

drop trigger if exists rap_activitate_ai on public.rap_activitate;
create trigger rap_activitate_ai after insert or update on public.rap_activitate
  for each row execute function public.rap_activitate_istoric();

-- -------------------------------------------------------------------------
-- 7. Funcții utile
-- -------------------------------------------------------------------------

-- 7a. Lunile pentru care se poate depune raport (încheiate, în valabilitatea
--     contractului, fără raport deja depus)
create or replace function public.rap_perioade_disponibile(p_contract uuid)
returns table (an integer, luna integer)
language sql stable
as $$
  select extract(year from m)::int, extract(month from m)::int
  from public.rap_contracte c,
       generate_series(
         date_trunc('month', c.valabil_de_la)::timestamp,
         least(
           coalesce(c.valabil_pana, current_date)::timestamp,
           (date_trunc('month', current_date) - interval '1 month')::timestamp
         ),
         interval '1 month'
       ) as m
  where c.id = p_contract
    and not exists (
      select 1 from public.rap_activitate r
      where r.contract_id = c.id
        and r.an = extract(year from m)::int and r.luna = extract(month from m)::int
    )
  order by 1 desc, 2 desc
$$;
grant execute on function public.rap_perioade_disponibile(uuid) to authenticated;

-- 7b. "Cine nu a depus": contractele active în luna aleasă, fără raport
create or replace function public.rap_nedepuse(p_an integer, p_luna integer)
returns table (
  contract_id uuid, nume text, email text, tip text,
  departament text, obiect text, numar_contract text
)
language sql stable
as $$
  select c.id, p.nume, p.email, c.tip, c.departament, c.obiect, c.numar_contract
  from public.rap_contracte c
  join public.rap_persoane p on p.id = c.persoana_id
  where public.rap_e_admin_activitate()
    and c.activ and p.activ
    and c.valabil_de_la <= (make_date(p_an, p_luna, 1) + interval '1 month' - interval '1 day')::date
    and (c.valabil_pana is null or c.valabil_pana >= make_date(p_an, p_luna, 1))
    and not exists (
      select 1 from public.rap_activitate r
      where r.contract_id = c.id and r.an = p_an and r.luna = p_luna
    )
  order by p.nume, c.obiect
$$;
grant execute on function public.rap_nedepuse(integer, integer) to authenticated;

-- 7c. Sexul persoanei: la angajați din HR, la externi din tabela Rapoartelor.
--     Îl poate cere autorul contractului sau un admin de activitate.
create or replace function public.rap_sex_persoana(p_persoana uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare p record; s text;
begin
  select * into p from public.rap_persoane where id = p_persoana;
  if not found then return null; end if;
  if not (public.rap_e_admin_activitate() or public.rap_persoana_mea(p_persoana)) then
    raise exception 'Fără acces.';
  end if;
  if p.tip = 'angajat' then
    select sex into s from public.hr_profil_angajat where angajat_id = p.angajat_id;
    return s;
  end if;
  return p.sex;
end $$;
grant execute on function public.rap_sex_persoana(uuid) to authenticated;

-- 7d. Contractele din HR ale unui angajat (pentru precompletare), doar admin de activitate
create or replace function public.rap_contracte_hr(p_angajat uuid)
returns table (
  hr_contract_id uuid, numar_contract text, data_inceput date, data_final date,
  atributie text, departament text, este_principal boolean
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.numar_contract, c.data_inceput_contract, c.data_final_contract,
         a.name,
         coalesce(d1.name, d2.name),
         c.este_principal
  from public.hr_contracte c
  join public.angajati g on g.id = c.angajat_id
  left join public.attributions a on a.id = c.atributie_id
  left join public.departments d1 on d1.id = c.departament_id
  left join public.departments d2 on d2.id = g.departament_id
  where c.angajat_id = p_angajat and public.rap_e_admin_activitate()
  order by c.este_principal desc, c.data_inceput_contract
$$;
grant execute on function public.rap_contracte_hr(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- 8. Rolul "Angajat" în Rapoarte pentru toți angajații activi care au cont
--    (poți schimba oricând din Hub → Administrare → Acces tool-uri)
-- -------------------------------------------------------------------------
insert into public.acces_tooluri (angajat_id, tool, rol)
select g.id, 'rapoarte', 'angajat'
from public.angajati g
where g.activ and g.user_id is not null
on conflict (angajat_id, tool) do nothing;

-- -------------------------------------------------------------------------
-- Verificare rapidă (opțional):
-- select rol, count(*) from public.acces_tooluri where tool = 'rapoarte' group by rol;
-- -------------------------------------------------------------------------
