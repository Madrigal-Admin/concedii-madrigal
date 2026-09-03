-- =========================================================================
-- Hub — Migrare 2: legătură angajati <-> cont de autentificare, plus
-- înregistrarea contului de admin ca prim rând în angajati.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

-- 1. Legătura cu contul de login
alter table public.angajati
  add column if not exists user_id uuid references auth.users(id);

create unique index if not exists angajati_user_id_key on public.angajati(user_id);

-- 2. Angajatul își poate lega propriul cont (self-service), la fel ca la HR
drop policy if exists "angajati_link_own_account" on public.angajati;
create policy "angajati_link_own_account" on public.angajati for update
  using (email = (auth.jwt() ->> 'email'))
  with check (email = (auth.jwt() ->> 'email'));

-- 3. Înregistrăm contul de admin ca prim angajat din Hub, deja legat de
--    contul lui de autentificare existent.
insert into public.angajati (nume_complet, email, user_id, activ)
select 'Administrator Digitalizare', 'digitalizare@madrigal.ro', id, true
from auth.users
where email = 'digitalizare@madrigal.ro'
  and not exists (
    select 1 from public.angajati where email = 'digitalizare@madrigal.ro'
  );

-- 4. Acces complet la Hub și la HR pentru acest cont
insert into public.acces_tooluri (angajat_id, tool, rol)
select a.id, 'hub', 'admin'
from public.angajati a
where a.email = 'digitalizare@madrigal.ro'
on conflict (angajat_id, tool) do nothing;

insert into public.acces_tooluri (angajat_id, tool, rol)
select a.id, 'hr', 'full'
from public.angajati a
where a.email = 'digitalizare@madrigal.ro'
on conflict (angajat_id, tool) do nothing;
