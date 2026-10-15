-- =========================================================================
-- Rapoarte — link public pentru colaboratori externi (fără cont în Hub)
-- Rulează o singură dată în Supabase → SQL Editor.
-- Colaboratorul alege dintr-o listă (persoane externe cu contract activ),
-- iar raportul intră direct în "De verificat", ca orice alt raport.
-- Protecții: întrebare matematică, câmp-capcană, limită de depuneri.
-- =========================================================================

-- Jurnal pentru limita de depuneri (nimeni nu îl poate citi din aplicație)
create table if not exists public.rap_extern_log (
  id uuid primary key default gen_random_uuid(),
  ip text,
  contract_id uuid,
  created_at timestamptz not null default now()
);
alter table public.rap_extern_log enable row level security;
create index if not exists rap_extern_log_ip_idx on public.rap_extern_log (ip, created_at);
create index if not exists rap_extern_log_contract_idx on public.rap_extern_log (contract_id, created_at);

-- 1. Lista afișată pe pagina publică: doar nume + contract (fără email/sex)
create or replace function public.rap_extern_lista()
returns table (persoana_id uuid, nume text, contract_id uuid, numar_contract text, obiect text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.nume, c.id, c.numar_contract, c.obiect
  from public.rap_persoane p
  join public.rap_contracte c on c.persoana_id = p.id
  where p.tip = 'extern' and p.activ and c.activ
  order by p.nume, c.valabil_de_la desc
$$;
grant execute on function public.rap_extern_lista() to anon, authenticated;

-- 2. Câmpurile suplimentare configurate pentru rapoartele de activitate
create or replace function public.rap_extern_campuri()
returns setof public.rap_campuri
language sql stable security definer set search_path = public
as $$
  select * from public.rap_campuri where modul = 'activitate' and activ order by ordine, created_at
$$;
grant execute on function public.rap_extern_campuri() to anon, authenticated;

-- 3. Lunile disponibile pentru un contract extern
create or replace function public.rap_extern_perioade(p_contract uuid)
returns table (an integer, luna integer)
language sql stable security definer set search_path = public
as $$
  select d.an, d.luna
  from public.rap_perioade_disponibile(p_contract) d
  where exists (
    select 1 from public.rap_contracte c join public.rap_persoane p on p.id = c.persoana_id
    where c.id = p_contract and c.activ and p.activ and p.tip = 'extern'
  )
$$;
grant execute on function public.rap_extern_perioade(uuid) to anon, authenticated;

-- 4. Depunerea raportului
create or replace function public.rap_extern_depune(
  p_contract uuid, p_an integer, p_luna integer,
  p_activitati text, p_extra jsonb,
  p_a integer, p_b integer, p_raspuns integer, p_capcana text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ip text := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'necunoscut'), ',', 1);
  v_extra jsonb := coalesce(p_extra, '{}'::jsonb);
  cmp record;
begin
  -- capcană pentru roboți: câmpul ascuns trebuie să fie gol
  if coalesce(p_capcana, '') <> '' then
    raise exception 'respins';
  end if;
  -- întrebarea matematică
  if p_a is null or p_b is null or p_raspuns is null
     or p_a not between 1 and 20 or p_b not between 1 and 20 or p_a + p_b <> p_raspuns then
    raise exception 'raspuns_gresit';
  end if;
  -- doar contracte ale persoanelor externe active
  if not exists (
    select 1 from public.rap_contracte c join public.rap_persoane p on p.id = c.persoana_id
    where c.id = p_contract and c.activ and p.activ and p.tip = 'extern'
  ) then
    raise exception 'contract_invalid';
  end if;
  -- limite de depuneri
  if (select count(*) from public.rap_extern_log where ip = v_ip and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.rap_extern_log where contract_id = p_contract and created_at > now() - interval '1 day') >= 3 then
    raise exception 'prea_multe';
  end if;
  insert into public.rap_extern_log (ip, contract_id) values (v_ip, p_contract);

  if length(btrim(coalesce(p_activitati, ''))) = 0 then
    raise exception 'activitati_lipsa';
  end if;
  if length(p_activitati) > 20000 or length(v_extra::text) > 20000 then
    raise exception 'prea_lung';
  end if;
  for cmp in select cod, eticheta from public.rap_campuri where modul = 'activitate' and activ and obligatoriu loop
    if btrim(coalesce(v_extra ->> cmp.cod, '')) = '' then
      raise exception 'camp_obligatoriu: %', cmp.eticheta;
    end if;
  end loop;

  -- reguli de lună/valabilitate/dublură sunt verificate de trigger și de cheia unică
  insert into public.rap_activitate (contract_id, an, luna, activitati, extra)
  values (p_contract, p_an, p_luna, btrim(p_activitati), v_extra);
end;
$$;
grant execute on function public.rap_extern_depune(uuid, integer, integer, text, jsonb, integer, integer, integer, text) to anon, authenticated;

-- 5. Istoricul: depunerile externe apar ca "Colaborator extern"
create or replace function public.rap_activitate_istoric()
returns trigger language plpgsql security definer set search_path = public
as $$
declare nume text; act text;
begin
  if auth.uid() is null then
    nume := 'Colaborator extern (link public)';
  else
    select coalesce(g.nume_complet, u.email) into nume
    from auth.users u left join public.angajati g on g.user_id = u.id
    where u.id = auth.uid();
  end if;

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
