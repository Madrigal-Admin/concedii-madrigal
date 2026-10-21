-- =========================================================================
-- HUB — Migrarea 14B: retragem accesul vizitatorilor fără cont ("anon")
--                      la TOATE tabelele din "public"
-- Proiect Supabase: qgofoygismknlqipgrng.supabase.co
--
-- RULEAZĂ-L DOAR DUPĂ ce ai rulat 14A ȘI ai încărcat pe GitHub noua versiune
-- a Hub-ului și a HR-ului (ecranul „Creează cont”) și Netlify a terminat
-- publicarea. Vezi CITESTE-MA.
--
-- Ce rămâne neschimbat: tot ce folosesc utilizatorii autentificați, funcțiile
-- Netlify (service role), paginile publice (RSVP, nominalizare, link extern
-- rapoarte) — toate lucrează prin funcții "security definer", nu prin tabele.
-- Poate fi rulat de mai multe ori.
-- =========================================================================

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Tabelele create de acum încolo (din SQL Editor) nu mai primesc acces anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Verificare (opțional): trebuie să returneze 0 rânduri.
-- select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind in ('r','v')
--   and has_table_privilege('anon', c.oid, 'select');
