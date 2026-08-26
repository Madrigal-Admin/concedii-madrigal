# Concedii Madrigal — ghid pas cu pas pentru publicare online (gratuit)

Acest ghid presupune că nu ai scris niciodată cod. Urmează pașii exact, în ordine.
Vei avea nevoie de: o adresă de email, ~30-40 de minute.

Vom folosi:
- **Supabase** — baza de date gratuită unde se salvează angajații, cererile de concediu etc.
- **GitHub** — locul unde "urcăm" codul (fără să instalezi nimic pe calculator)
- **Netlify** — serviciul care ia codul de pe GitHub și îl publică pe un link public gratuit

---

## PARTEA 1 — Creezi baza de date pe Supabase

1. Intră pe **https://supabase.com** și apasă **Start your project** / **Sign up**. Poți crea cont cu Google sau cu email.
2. După ce te loghezi, apasă **New project**.
   - **Name**: `concedii-madrigal` (sau orice nume)
   - **Database Password**: generează una și **salveaz-o undeva** (nu o vei mai vedea)
   - **Region**: alege una din Europa (ex. Frankfurt) pentru viteză mai bună din România
   - Apasă **Create new project** și așteaptă 1-2 minute până se pregătește.
3. În meniul din stânga, apasă pe iconița **SQL Editor**.
4. Apasă **New query**.
5. Deschide fișierul `supabase_schema.sql` din arhiva primită (cu Notepad, TextEdit sau orice editor de text), selectează tot conținutul (Ctrl+A, Ctrl+C) și lipește-l în caseta din SQL Editor.
6. Apasă butonul **Run** (sau Ctrl+Enter). Ar trebui să vezi "Success. No rows returned". Asta a creat toate tabelele, regulile de securitate și 5 angajați demonstrativi.
7. În meniul din stânga, mergi la **Project Settings** (iconița roată dințată) → **API**.
   - Copiază valoarea de la **Project URL** — o vei numi `VITE_SUPABASE_URL`
   - Copiază valoarea de la **anon public** (sub "Project API keys") — o vei numi `VITE_SUPABASE_ANON_KEY`
   - Ține-le la îndemână, le folosești la Partea 3.

### Creezi contul de Admin (tu, HR)

8. În meniul din stânga, mergi la **Authentication** → **Users** → apasă **Add user** → **Create new user**.
   - Introdu email-ul tău și o parolă (minim 6 caractere).
   - **Debifează** opțiunea "Auto Confirm User" dacă există și e activată din greșeală — de fapt, las-o bifată (Auto Confirm = da), ca să te poți loga imediat fără email de confirmare.
   - Apasă **Create user**.
9. Dă click pe utilizatorul nou creat din listă și **copiază UID-ul** lui (un șir lung de tip `xxxxxxxx-xxxx-...`).
10. Mergi din nou la **SQL Editor** → **New query** și rulează (înlocuind cu UID-ul tău real):

```sql
insert into public.admins (id) values ('lipește-UID-ul-aici');
```

11. Apasă **Run**. Acum contul tău are drepturi de Admin în aplicație.

> Poți repeta pașii 8-11 oricând vrei să adaugi un al doilea cont de Admin.

---

## PARTEA 2 — Urci codul pe GitHub (fără instalări)

1. Intră pe **https://github.com** și creează-ți un cont gratuit (dacă nu ai deja).
2. Apasă butonul verde **New** (sau semnul **+** din dreapta sus → **New repository**).
   - **Repository name**: `concedii-madrigal`
   - Lasă-l **Public** sau **Private**, ambele merg cu Netlify (Private e mai discret pentru un tool intern).
   - **Nu** bifa "Add a README file".
   - Apasă **Create repository**.
3. Pe pagina goală a repo-ului, cauți link-ul **uploading an existing file** (sau butonul **Add file → Upload files**).
4. Dezarhivează folderul `leave-app` primit de la mine pe calculatorul tău.
5. Din interiorul folderului `leave-app` (nu folderul părinte!), selectează **toate fișierele și subfolderele** (`src`, `index.html`, `package.json`, `supabase_schema.sql`, etc.) și trage-le în zona de upload din GitHub.
   - Notă: fișierele `.env` nu există în arhivă (e corect — nu trebuie urcat niciodată un fișier `.env` cu chei secrete pe GitHub).
6. Așteaptă să se încarce toate fișierele, apoi apasă **Commit changes**.

---

## PARTEA 3 — Publici aplicația pe Netlify

1. Intră pe **https://netlify.com** și creează-ți un cont gratuit — cel mai simplu e **Sign up with GitHub**, ca să se conecteze automat.
2. Din contul Netlify, apasă **Add new site** → **Import an existing project**.
3. Alege **Deploy with GitHub**, autorizează accesul, apoi selectează repo-ul `concedii-madrigal` creat mai devreme.
4. La pasul de configurare a build-ului, completează exact așa:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. **Înainte** de a apăsa Deploy, deschide secțiunea **Environment variables** (sau "Show advanced") și adaugă:
   - Key: `VITE_SUPABASE_URL` → Value: (URL-ul copiat la Partea 1, pasul 7)
   - Key: `VITE_SUPABASE_ANON_KEY` → Value: (cheia anon copiată la Partea 1, pasul 7)
6. Apasă **Deploy site**. Netlify va instala automat tot ce trebuie și va construi aplicația — durează 1-2 minute. Poți urmări progresul în tabul **Deploys**.
7. Când status-ul devine **Published**, sus vei vedea un link de forma `https://nume-generat-aleatoriu.netlify.app` — acesta este linkul tău public, funcțional, gratuit.

### (Opțional) Un link mai frumos

Din **Site settings → Domain management → Options → Edit site name**, poți schimba `nume-generat-aleatoriu` în ceva de tipul `concedii-madrigal`, astfel încât linkul să devină `https://concedii-madrigal.netlify.app`.

---

## Actualizare — an calendaristic real (funcție nouă)

Cea mai recentă actualizare leagă soldurile de **ani calendaristici reali** (2024, 2025, 2026
etc.) în loc de etichete relative ("acum 2 ani"). Practic, de acum aplicația:

- pe **1 ianuarie**, trece automat la anul nou, fără nicio acțiune din partea ta
- pe **30 iunie**, expiră automat zilele din urmă cu 2 ani

Rulează o singură dată **`migration_4_calendar_year_balances.sql`** în Supabase → SQL Editor
(preia automat tot ce ai completat deja la soldul inițial), apoi re-urcă fișierele pe GitHub.

## Actualizări anterioare

Dacă ai instalat deja aplicația și ai primit o versiune nouă de la mine cu îmbunătățiri
(ex. departamente/funcții din listă, raport exportabil, distribuția editabilă a zilelor
scăzute), trebuie să faci **două lucruri**, o singură dată:

1. **Rulează fișierul `migration_2_departments_positions_deductions.sql`** — deschide-l cu
   un editor de text, copiază tot conținutul, lipește-l în Supabase → **SQL Editor** →
   **New query**, apoi **Run** (confirmă avertismentul standard).
2. **Re-urcă fișierele pe GitHub** — la fel ca prima dată: intri în repo-ul
   `concedii-madrigal` → **Add file → Upload files** → tragi toate fișierele din folderul
   `leave-app` peste cele existente → **Commit changes**. Netlify republică automat în
   1-2 minute.

După acest pas, du-te în **Panoul Admin → Setări** și verifică/completează listele de
departamente și funcții, apoi editează fiecare angajat (tab **Angajați**) ca să-i asociezi
noul departament din listă (angajații vechi au fost legați automat, dar merită verificat).

## Cum se folosește aplicația

- **Angajații** intră pe link, completează formularul (nume din listă, tip concediu, perioadă) — fără cont, fără parolă.
- **Tu (Admin)** apeși pe "Autentificare" din partea de sus, te loghezi cu contul creat la Partea 1, și ajungi în Panoul Admin unde:
  - adaugi/editezi/ștergi angajați, cu departament și funcție alese dintr-o listă (tab **Angajați**)
  - gestionezi listele de departamente și funcții (tab **Setări**)
  - aprobi sau respingi cereri; la aprobare, aplicația calculează automat din ce categorii
    se scad zilele, iar tu poți corecta manual distribuția dacă e cazul (tab **Aprobări**)
  - adaugi zile de recuperare pentru ore suplimentare (tab **Recuperări**)
  - vezi soldul tuturor angajaților, plus un raport filtrabil pe perioadă și pe angajați,
    exportabil în Excel sau printabil direct din browser (tab **Privire generală**)
- **Angajații care vor cont** (opțional) apasă "Autentificare" → "Sunt angajat, vreau cont" și își creează un cont folosind **exact același email** cu care au fost adăugați în sistem de tine. După asta se pot loga oricând să-și vadă soldul detaliat.

## Cum faci modificări mai târziu

Orice modificare de cod o faci editând fișierele local (sau cerându-mi mie o versiune nouă), apoi le re-urci pe GitHub (Add file → Upload files, peste fișierele existente). Netlify redetectează automat schimbarea și republică site-ul în 1-2 minute — nu trebuie să repeți pașii de la Netlify sau Supabase.

Datele (angajați, cereri, recuperări) locuiesc în Supabase și **nu se pierd niciodată** când republici aplicația.

## Câteva note despre reguli de business, ca să știi exact ce am implementat

- Zilele de concediu se scad, la aprobare, în ordinea: 1) Recuperări, 2) zile de acum 2 ani (dacă nu au expirat), 3) anul trecut, 4) anul curent.
- Zilele reportate de acum 2 ani expiră strict pe 30 iunie a anului curent — după această dată, aplicația le arată automat ca fiind 0 / expirate.
- Soldul poate deveni negativ (doar din anul curent), exact cum ai cerut, ca să reflecte ore suplimentare ce urmează a fi prestate.
- Doar tipurile de concediu **Odihnă** și **Evenimente Speciale** scad din soldul de zile. **Medical** și **Fără Plată** sunt informative și nu ating soldul — pot fi schimbate ușor în `src/lib/leaveCalculations.js` dacă vrei altă logică.
- Alocarea anuală de bază (ex. 21, 24, 25 zile) e un singur număr per angajat, aplicat identic pentru anul curent și cei 2 anteriori. Dacă la un moment dat ai nevoie ca alocarea să difere de la an la an pentru același angajat, se poate extinde ulterior.

## Dacă ceva nu merge

- **Dropdown-ul de angajați e gol pe formularul public** → intră ca Admin și adaugă cel puțin un angajat din tab-ul "Angajați".
- **Nu te poți loga ca Admin** → verifică la Partea 1, pasul 10, că ai rulat corect comanda SQL cu UID-ul corect (fără spații, cu ghilimele simple).
- **Un angajat nu-și poate crea cont** → emailul folosit la înregistrare trebuie să fie identic (litere mici) cu emailul din fișa lui din tab-ul "Angajați".
- **Pagina e albă după deploy** → verifică în Netlify, la Site settings → Environment variables, că cele două chei Supabase sunt scrise exact, fără spații la început/sfârșit.
