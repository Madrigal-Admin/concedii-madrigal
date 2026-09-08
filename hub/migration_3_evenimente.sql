-- =========================================================================
-- Hub — Migrare 3: pilonul central "evenimente"
-- Sincronizat unidirecțional din ClickUp (lista "ORGANIZATOR EVENIMENTE"),
-- printr-un buton manual din Hub. Rulează o singură dată, în SQL Editor.
-- =========================================================================

create table if not exists public.evenimente (
  id uuid primary key default gen_random_uuid(),
  clickup_task_id text unique not null,
  nume text not null,
  data date,
  status text, -- 'deschis' | 'in organizare' | 'finalizat' (valorile brute din ClickUp)
  locatie text,
  responsabil text,
  bilete boolean,
  implicare text, -- 'Organizator' | 'Partener' | 'Invitat'

  -- Flag-uri setate manual de admin, NICIODATĂ suprascrise de sincronizare
  necesita_rsvp boolean not null default false,
  necesita_costume boolean not null default false,

  ultima_sincronizare timestamptz,
  created_at timestamptz not null default now()
);

alter table public.evenimente enable row level security;

-- Vizibil pentru orice angajat autentificat (e un calendar comun)
drop policy if exists "evenimente_select_all" on public.evenimente;
create policy "evenimente_select_all" on public.evenimente for select
  using (auth.uid() is not null);

-- Doar admin Hub poate ajusta flag-urile (necesita_rsvp/necesita_costume)
-- din interfață. Sincronizarea propriu-zisă scrie prin service_role,
-- direct din funcția serverless, ocolind RLS.
drop policy if exists "evenimente_write_hub_admin" on public.evenimente;
create policy "evenimente_write_hub_admin" on public.evenimente for update
  using (
    exists (
      select 1 from public.acces_tooluri
      where angajat_id = (select id from public.angajati where user_id = auth.uid())
        and tool = 'hub'
        and rol = 'admin'
    )
  );
