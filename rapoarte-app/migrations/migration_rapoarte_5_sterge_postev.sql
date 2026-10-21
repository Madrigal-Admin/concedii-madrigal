-- =========================================================================
-- RAPOARTE — Migrarea 5: ștergerea unui raport post-eveniment
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- Doar Adminul general Rapoarte poate șterge un raport post-eveniment
-- (ex: raport de test, ca să nu intre în cifrele din Dashboard).
-- Ștergerea e definitivă; rămâne doar o mențiune scurtă (cine, când, ce raport)
-- într-un jurnal vizibil doar Adminului general.
-- Poate fi rulat de mai multe ori.
-- =========================================================================

create table if not exists public.rap_postev_sterse (
  id uuid primary key default gen_random_uuid(),
  raport_id uuid not null,
  eveniment_nume text,
  data_inceput date,
  stare text,
  sters_de uuid,
  nume_utilizator text,
  la timestamptz not null default now()
);

alter table public.rap_postev_sterse enable row level security;

drop policy if exists rap_postev_sterse_select on public.rap_postev_sterse;
create policy rap_postev_sterse_select on public.rap_postev_sterse for select
  to authenticated using (public.rap_e_admin_general());

grant select on public.rap_postev_sterse to authenticated;
grant select, insert, update, delete on public.rap_postev_sterse to service_role;

-- Rapoartele post-eveniment rămân protejate la ștergere, cu o singură excepție:
-- funcția de mai jos (doar Admin general), care ridică temporar semnul de permisiune.
create or replace function public.rap_postev_blocheaza_stergerea()
returns trigger language plpgsql
as $$
begin
  if coalesce(current_setting('rap.permite_stergere', true), '') <> 'on' then
    raise exception 'Rapoartele nu se pot șterge.';
  end if;
  return old;
end $$;

drop trigger if exists rap_postev_bd on public.rap_postev;
create trigger rap_postev_bd before delete on public.rap_postev
  for each row execute function public.rap_postev_blocheaza_stergerea();

create or replace function public.rap_postev_sterge(p_raport uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_nume text;
begin
  if not public.rap_e_admin_general() then
    raise exception 'Doar Adminul general poate șterge un raport post-eveniment.';
  end if;

  select * into r from public.rap_postev where id = p_raport;
  if not found then
    raise exception 'Raportul nu există (poate a fost șters deja).';
  end if;

  select a.nume_complet into v_nume from public.angajati a where a.user_id = auth.uid() limit 1;

  insert into public.rap_postev_sterse (raport_id, eveniment_nume, data_inceput, stare, sters_de, nume_utilizator)
  values (r.id, r.eveniment_nume, r.data_inceput, r.stare, auth.uid(), v_nume);

  perform set_config('rap.permite_stergere', 'on', true);
  delete from public.rap_postev_istoric where raport_id = p_raport;
  delete from public.rap_postev where id = p_raport;
  perform set_config('rap.permite_stergere', 'off', true);
end;
$$;

revoke all on function public.rap_postev_sterge(uuid) from public, anon;
grant execute on function public.rap_postev_sterge(uuid) to authenticated;
