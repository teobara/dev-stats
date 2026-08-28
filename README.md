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
│   │   ├── set-password.js # creeaza/reseteaza parola unui utilizator (CLI)
│   │   ├── seed.js       # date de test opționale
│   │   ├── middleware/auth.js # sesiune (cookie) + protecția rutelor
│   │   └── routes/       # auth.js, developers.js, projects.js, summary.js
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

## Autentificare

Aplicația are un sistem propriu de login (utilizator + parolă), nu doar o parolă comună. La prima
încărcare, dacă nu ești autentificat, vezi ecranul de login; sesiunea se ține într-un cookie
`httpOnly` (nu poate fi citit din JavaScript în browser) și expiră după 30 de zile.

Parola nu e stocată niciodată în clar — doar hash (scrypt) + salt, în tabela `users` din SQLite.

**Creezi/resetezi un utilizator** din linia de comandă (rulează din rădăcina proiectului):

```bash
node server/src/set-password.js Teo
```

Fără al treilea argument, se generează automat o parolă aleatoare și se afișează o singură dată în
consolă. Poți și seta tu una explicit:

```bash
node server/src/set-password.js Teo parola-mea-noua
```

Rulând comanda din nou pentru același utilizator îi schimbă parola (și deconectează automat orice
sesiune veche activă a acelui cont).

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
   - `BOOTSTRAP_USERNAME=Teo` și `BOOTSTRAP_PASSWORD=parola-ta` — la prima pornire, serverul
     creează automat acest utilizator dacă nu există deja. E sigur să lași aceste două variabile
     setate permanent: la orice restart ulterior, dacă utilizatorul deja există, nu se întâmplă
     nimic (nu îi resetează parola).
5. Deploy. Railway îți dă un URL public (`*.up.railway.app`), accesibil de pe orice dispozitiv —
   te poți loga direct cu `BOOTSTRAP_USERNAME`/`BOOTSTRAP_PASSWORD` de mai sus.

**Alternativă**, dacă ai [Railway CLI](https://docs.railway.com/guides/cli) instalat și conectat:
poți crea/reseta un utilizator direct, fără variabile de bootstrap:

```bash
railway run node server/src/set-password.js Teo
```

## Limitări cunoscute / posibile extinderi viitoare

- **Un singur nivel de acces** — orice utilizator autentificat vede tot (nu există roluri
  admin/citire etc.). Pentru un instrument intern e suficient, dar e un pas suplimentar dacă vrei
  permisiuni diferențiate.
- **Fără "am uitat parola" din UI** — resetarea parolei se face din linia de comandă
  (`set-password.js`), nu există flux de recuperare prin email.
- **Procentul de alocare e static** — nu variază automat lună de lună (vezi secțiunea de model de
  date mai sus).
- **Fără editare de sume trecute prin UI de tip "istoric audit"** — poți suprascrie o sumă lunară,
  dar nu există un jurnal al modificărilor.
- **Monedă fixă (EUR)** — ușor de schimbat în `client/src/format.js` dacă ai nevoie de altă monedă.
