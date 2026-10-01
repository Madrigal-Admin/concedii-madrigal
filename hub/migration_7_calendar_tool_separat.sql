-- =========================================================================
-- Hub — Migrare 7: Calendar devine tool SEPARAT în acces_tooluri (coloană
-- proprie, ca HR/Invitații/Administrativ), nu un rol sub "hub". Rulează o
-- singură dată, în SQL Editor.
-- =========================================================================

-- 1. Extindem lista de tool-uri permise (gotcha cunoscut — vezi notele
--    din proiect)
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.acces_tooluri'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%tool%';

  if v_conname is not null then
    execute format('alter table public.acces_tooluri drop constraint %I', v_conname);
  end if;
end $$;

alter table public.acces_tooluri
  add constraint acces_tooluri_tool_check
  check (tool in ('hub', 'hr', 'invitatii', 'administrativ', 'calendar'));

-- 2. Migrăm orice acordare făcută deja sub "hub"/"calendar" (dacă există)
--    spre noul tool separat "calendar"/"admin"
update public.acces_tooluri
set tool = 'calendar', rol = 'admin'
where tool = 'hub' and rol = 'calendar';

-- 3. Actualizăm politicile care verificau tool='hub' and rol='calendar',
--    să verifice acum tool='calendar' and rol='admin' (pe lângă Hub Admin
--    complet, care păstrează mereu acces)
drop policy if exists "evenimente_write_hub_admin" on public.evenimente;
create policy "evenimente_write_hub_admin" on public.evenimente for update
  using (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and ((tool = 'hub' and rol = 'admin') or (tool = 'calendar' and rol = 'admin'))
    )
  );

drop policy if exists "evenimente_tag_culori_write" on public.evenimente_tag_culori;
create policy "evenimente_tag_culori_write" on public.evenimente_tag_culori for all
  using (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and ((tool = 'hub' and rol = 'admin') or (tool = 'calendar' and rol = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and ((tool = 'hub' and rol = 'admin') or (tool = 'calendar' and rol = 'admin'))
    )
  );
