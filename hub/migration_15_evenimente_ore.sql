-- =========================================================================
-- HUB — Migrarea 15: ora evenimentelor (preluată din ClickUp)
-- Rulează ÎNAINTE de a încărca noua versiune a Hub-ului (altfel
-- sincronizarea cu ClickUp ar da eroare). Poate fi rulat de mai multe ori.
-- =========================================================================
alter table public.evenimente add column if not exists ora_inceput text;
alter table public.evenimente add column if not exists ora_sfarsit text;
