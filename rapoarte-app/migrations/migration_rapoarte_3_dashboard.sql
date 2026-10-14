-- =========================================================================
-- RAPOARTE — Migrarea 3: Dashboard post-eveniment
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- Rulează O SINGURĂ DATĂ, în SQL Editor, DUPĂ migrările 1 și 2.
-- (Dacă apare pop-up-ul "Potential issues", alege "Run and enable RLS".)
--
-- Ce face: creează funcția care dă dashboardului DOAR rapoartele APROBATE,
-- doar pentru Admin general, Admin post-eveniment și Vizualizare dashboard.
-- Cei din urmă nu pot citi direct rapoartele; văd doar ce întoarce această
-- funcție. NU modifică și nu șterge nimic.
-- =========================================================================

create or replace function public.rap_dashboard_postev()
returns table (
  id uuid,
  denumire_oficiala text,
  tipuri text[],
  data_inceput date,
  data_sfarsit date,
  implicare text,
  localitati jsonb,
  echipa jsonb,
  responsabil_angajat_id uuid,
  responsabil text,
  locatie text,
  valori jsonb,
  bife jsonb,
  eveniment_manual boolean
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.denumire_oficiala, r.tipuri, r.data_inceput, r.data_sfarsit, r.implicare,
         r.localitati, r.echipa, r.responsabil_angajat_id, g.nume_complet, r.locatie,
         r.valori, r.bife, r.eveniment_manual
  from public.rap_postev r
  join public.angajati g on g.id = r.responsabil_angajat_id
  where r.stare = 'aprobat'
    and public.rap_rol() in ('admin_general', 'admin_postev', 'vizualizare')
  order by r.data_inceput desc
$$;

grant execute on function public.rap_dashboard_postev() to authenticated;
