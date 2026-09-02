-- =========================================================================
-- Migrare 3 — Concedii Madrigal
-- Adaugă "sold inițial" per angajat (Recuperări / Acum 2 ani / Anul trecut /
-- Anul curent), ca să poți introduce direct situația actuală a fiecărui
-- angajat, fără să reintroduci manual tot istoricul de cereri.
-- Rulează tot fișierul o singură dată, în SQL Editor.
-- =========================================================================

alter table public.employees
  add column if not exists opening_recoveries numeric not null default 0,
  add column if not exists opening_y2 numeric not null default 0,
  add column if not exists opening_y1 numeric not null default 0,
  add column if not exists opening_y numeric not null default 0;

-- Notă: de acum, soldul afișat pentru fiecare angajat = soldul inițial de mai
-- sus, minus zilele scăzute prin cereri aprobate DUPĂ ce ai completat soldul
-- inițial. Coloana "base_annual_days" rămâne doar informativă (poate fi
-- folosită ca reper anul viitor), nu mai intră direct în calculul soldului.
