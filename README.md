# Dev Profit Tracker

Aplicație web pentru gestionarea programatorilor, proiectelor și profitului lunar generat de fiecare programator.

**Stack:** React (Vite) + Node.js/Express + SQLite · gândit pentru deploy pe Railway.

## Ce face aplicația

1. **Programatori** — adaugi/editezi/ștergi programatori (nume, rol/tehnologie, email).
2. **Proiecte** — creezi proiecte, aloci unul sau mai mulți programatori pe fiecare proiect și înregistrezi **venitul încasat lunar** pentru acel proiect.
3. **Dashboard lunar** — pentru orice lună selectată, vezi câți bani ai încasat, cât ai cheltuit și ce profit a generat **fiecare programator**.
4. **Cost lunar per programator** — pe pagina fiecărui programator, adaugi cât îl costă lunar (salariu/plată) firma; aplicația calculează automat **profit = venit atribuit − cost**.

## Modelul de date — o presupunere importantă de validat

Un proiect poate avea **mai mulți programatori**. Ca să știm cât din venitul lunar al unui proiect
"aparține" fiecărui programator (pentru calculul veniturilor lui personale), fiecare alocare
programator↔proiect are un **procent (`share_percent`)**.

- Dacă un proiect are un singur programator, procentul lui e implicit **100%**.
- Dacă are mai mulți, poți seta manual procentul fiecăruia (ex: 60% / 40%), pe pagina proiectului.
- Venitul lunar atribuit unui programator = suma, pe toate proiectele lui, din `venit_lunar_proiect × procent_alocat`.
- Acest procent este fix (nu variază automat de la o lună la alta) — dacă un programator lucrează
  diferit ca implicare de la o lună la alta pe același proiect, procentul trebuie ajustat manual.

Dacă nu asta ai avut în minte (de exemplu, ai vrea introducere manuală a sumei exacte per
programator/proiect/lună, în loc de procent), spune-mi și ajustez modelul — e o schimbare
localizată, nu afectează restul aplicației.

## Structura proiectului

```
DevStats/
├── server/              # API Express + baza de date SQLite
│   ├── src/
│   │   ├── index.js     # punct de intrare: rute API + servește build-ul React în producție
│   │   ├── db.js        # schema SQLite (creată automat la prima pornire)
│   │   ├── auth.js      # protecție opțională cu parolă (Basic Auth)
│   │   ├── seed.js       # date de test opționale
│   │   └── routes/       # developers.js, projects.js, summary.js
│   └── data/             # fișierul .sqlite local (ignorat de git)
├── client/               # React (Vite)
│   └── src/
│       ├── pages/         # Dashboard, Developers, DeveloperDetail, Projects, ProjectDetail
│       ├── components/    # NavBar, MonthPicker, StatCard, BarRow
│       └── api.js         # toate apelurile către API
├── railway.json           # config pentru deploy pe Railway
└── package.json            # workspace-ul rădăcină (scripts: dev / build / start)
```

## Rulare locală

Necesită [Node.js](https://nodejs.org) 22.5+ (foloseste modulul SQLite integrat `node:sqlite`,
fara nicio compilare nativa). Verifică cu `node -v`.

```bash
npm install
```

Acest singur `npm install` instalează dependențele pentru `server` și `client` deodată (folosim
npm workspaces).

Opțional, adaugă date de test (3 programatori, 3 proiecte, ultimele 3 luni):

```bash
npm run seed
```

Pornește aplicația în modul dezvoltare (server pe :4000, React pe :5173 cu reîncărcare automată):

```bash
npm run dev
```

Deschide **http://localhost:5173**.

### Build de producție (ce rulează și pe Railway)

```bash
npm run build   # compilează React în client/dist
npm start       # pornește Express pe portul din variabila PORT (implicit 4000)
```

În producție, Express servește direct fișierele React din `client/dist` — un singur proces, un
singur port.

## Protecție cu parolă (recomandat pentru online)

Aplicația conține date financiare și, odată publicată pe Railway, e accesibilă de oricine are
link-ul. Poți cere o parolă simplă (HTTP Basic Auth, aceeași pentru toată lumea) setând variabila
de mediu:

```
APP_PASSWORD=parola-ta-secreta
```

Dacă nu setezi această variabilă (ex: local, în dezvoltare), aplicația nu cere nicio parolă.

## Deploy pe Railway

1. Creează un proiect nou pe [railway.app](https://railway.app) și conectează-l la acest folder
   (fie printr-un repo Git pe GitHub, fie cu `railway up` din CLI).
2. Railway detectează automat Node.js (Nixpacks), rulează `npm install` → `npm run build` →
   `npm run start`. Nu trebuie configurat nimic suplimentar pentru build.
3. **Adaugă un Volume** (Railway → serviciul tău → tab *Volumes*), montat de exemplu la `/data`.
   Baza de date SQLite trebuie să stea pe acest disc persistent, altfel se pierde la fiecare
   redeploy.
4. Setează variabilele de mediu ale serviciului:
   - `DB_PATH=/data/dev.sqlite` (calea către fișierul SQLite, pe volumul montat la pasul 3)
   - `APP_PASSWORD=...` (opțional, dar recomandat — vezi secțiunea de mai sus)
5. Deploy. Railway îți dă un URL public (`*.up.railway.app`), accesibil de pe orice dispozitiv.

## Limitări cunoscute / posibile extinderi viitoare

- **Fără login per utilizator** — momentan e o singură parolă comună (Basic Auth), nu conturi
  individuale. Dacă vrei acces diferențiat pe useri, e un pas suplimentar.
- **Procentul de alocare e static** — nu variază automat lună de lună (vezi secțiunea de model de
  date mai sus).
- **Fără editare de sume trecute prin UI de tip "istoric audit"** — poți suprascrie o sumă lunară,
  dar nu există un jurnal al modificărilor.
- **Monedă fixă (RON)** — ușor de schimbat în `client/src/format.js` dacă ai nevoie de altă monedă.
