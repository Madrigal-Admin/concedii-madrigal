-- =========================================================================
-- FAZA 6b — Avansare an pentru soldurile HR (buton "Trece la anul nou")
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
-- Rulează O SINGURĂ DATĂ, în SQL Editor, DUPĂ migration_hub_hr_faza6.sql.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. an_referinta — anul calendaristic pentru care sunt valabile soldurile
--    curente din hr_profil_angajat. Fără acest reper, aplicația nu are cum
--    să știe automat "cât de vechi" e sold_an_curent, ca să propună
--    avansarea la anul nou.
-- -------------------------------------------------------------------------

alter table public.hr_profil_angajat
  add column if not exists an_referinta integer;

update public.hr_profil_angajat
  set an_referinta = extract(year from now())::int
  where an_referinta is null;

alter table public.hr_profil_angajat
  alter column an_referinta set default extract(year from now())::int,
  alter column an_referinta set not null;

-- -------------------------------------------------------------------------
-- 2. rollover_hr_profil_angajat() — apelată din Panoul Admin (buton
--    "Trece la anul nou"), avansează soldurile TUTUROR angajaților cu câte
--    un an, cât timp mai există rânduri rămase în urmă (acoperă și cazul în
--    care nimeni nu a apăsat butonul de mai mulți ani).
--
--    Pentru fiecare an avansat:
--      - sold_an_minus_2 vechi se pierde (era oricum deja expirat la 30 iun.)
--      - sold_an_minus_1 vechi → sold_an_minus_2 nou
--      - sold_an_curent vechi  → sold_an_minus_1 nou
--      - sold_an_curent nou    → zile_concediu_baza_an (implicit, ca în
--        vechiul mecanism year_allocations, care cădea automat pe
--        base_annual_days când nu exista un rând explicit pentru anul nou)
-- -------------------------------------------------------------------------

create or replace function public.rollover_hr_profil_angajat()
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Doar administratorii HR pot avansa anul.';
  end if;

  while exists (
    select 1 from public.hr_profil_angajat
    where an_referinta < extract(year from now())::int
  ) loop
    update public.hr_profil_angajat
    set
      sold_an_minus_2 = sold_an_minus_1,
      sold_an_minus_1 = sold_an_curent,
      sold_an_curent = zile_concediu_baza_an,
      an_referinta = an_referinta + 1
    where an_referinta < extract(year from now())::int;
  end loop;
end;
$$;

grant execute on function public.rollover_hr_profil_angajat() to authenticated;
