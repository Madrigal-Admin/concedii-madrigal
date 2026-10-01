-- =========================================================================
-- Hub — Migrare 6: taguri pe evenimente + rol nou "calendar" (control
-- separat pentru bifele RSVP/Costume, fără acces complet de Hub Admin) +
-- tabel de culori pentru taguri. Rulează o singură dată, în SQL Editor.
-- =========================================================================

-- 1. Coloană nouă pentru tagurile aduse din ClickUp
alter table public.evenimente add column if not exists tags text[] default '{}';

-- 2. Tabel de culori per tag — populat automat la prima apariție a unui
--    tag nou (în cod), editabil manual din Hub
create table if not exists public.evenimente_tag_culori (
  tag text primary key,
  culoare text not null default '#7F77DD'
);

alter table public.evenimente_tag_culori enable row level security;

drop policy if exists "evenimente_tag_culori_select" on public.evenimente_tag_culori;
create policy "evenimente_tag_culori_select" on public.evenimente_tag_culori for select
  using (auth.uid() is not null);

drop policy if exists "evenimente_tag_culori_write" on public.evenimente_tag_culori;
create policy "evenimente_tag_culori_write" on public.evenimente_tag_culori for all
  using (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and tool = 'hub' and rol in ('admin', 'calendar')
    )
  )
  with check (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and tool = 'hub' and rol in ('admin', 'calendar')
    )
  );

-- 3. Permitem și rolului "calendar" (nu doar "admin") să scrie flag-urile
--    necesita_rsvp/necesita_costume pe evenimente
drop policy if exists "evenimente_write_hub_admin" on public.evenimente;
create policy "evenimente_write_hub_admin" on public.evenimente for update
  using (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and tool = 'hub' and rol in ('admin', 'calendar')
    )
  );
