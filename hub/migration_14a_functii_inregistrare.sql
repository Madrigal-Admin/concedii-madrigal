-- =========================================================================
-- HUB — Migrarea 14A: funcții pentru crearea contului (înainte de login)
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- DE CE: ecranele „Creează cont” din Hub și HR verificau dacă emailul e în
-- lista de angajați citind direct tabelele "angajati" / "employees" FĂRĂ să fii
-- autentificat. Asta înseamnă că oricine putea citi listele de angajați.
-- Le înlocuim cu două funcții care răspund DOAR la întrebarea „există acest
-- email?” (fără să listeze nimic). Ordinea corectă e în CITESTE-MA.
--
-- SIGUR: doar adaugă două funcții. Poate fi rulat de mai multe ori.
-- =========================================================================

create or replace function public.hub_stare_email(p_email text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_gasit boolean := false;
begin
  select true, a.user_id into v_gasit, v_user
  from public.angajati a
  where lower(trim(a.email)) = lower(trim(p_email))
  limit 1;

  if not coalesce(v_gasit, false) then
    return 'nu_exista';
  elsif v_user is not null then
    return 'are_cont';
  end if;
  return 'liber';
end;
$$;

create or replace function public.hr_email_in_lista(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where lower(trim(e.email)) = lower(trim(p_email))
  );
$$;

revoke all on function public.hub_stare_email(text) from public;
revoke all on function public.hr_email_in_lista(text) from public;
grant execute on function public.hub_stare_email(text) to anon, authenticated;
grant execute on function public.hr_email_in_lista(text) to anon, authenticated;
