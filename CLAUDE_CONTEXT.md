# CLAUDE_CONTEXT.md
> Læs denne fil når du hjælper med udviklingen af dette projekt.
> Den definerer pensum, krav, kodestil og hvilke teknologier der er i spil.

---

## OM PROJEKTET

Vi bygger en **webapplikation til analyse og simulering af ejendomsinvesteringer** som private investorer.

Applikationen skal:
- Slå en registreret ejendom op og validere adressen via et **offentligt API**
- Hente og vise data om boligen
- Opstille en investeringscase (køb + finansiering + driftsbudget)
- Understøtte udlejningsscenarier (løbende ind- og udgifter)
- Vise en fremtidssimulering: cashflow, afdrag, værdiudvikling og nøgletal

**Vigtig note:** Det er en prototype, ikke et færdigt finansprodukt. Fokus er på at simulere cases og gøre komplekse sammenhænge forståelige.

---

## TEKNISK STACK (krav fra opgaven)

| Lag | Teknologi |
|---|---|
| Frontend | HTML, CSS, JavaScript (vanilla — ingen frameworks) |
| Backend | Node.js med Express |
| Database | SQL Server (T-SQL, normaliseret) |
| Dataudveksling | JSON over HTTP |

**Ingen JavaScript frontend-frameworks** (React, Vue, Angular etc.) er tilladt. Teori udenfor pensum belønnes ikke.

---

## PENSUM OG TILLADTE KILDER

Disse kilder må bruges og refereres til. Hold koden inden for den viden de dækker.

### Bøger
- **Eloquent JavaScript** — JS grundlag, typer, funktioner, asynkronitet, DOM
- **T-SQL Fundamentals** — SQL queries, joins, transaktioner, normalisering
- **UML @ Classroom** — UML diagrammer, use cases, sekvensdiagrammer
- **Entity Relationship Modeling with UML** — ER-diagrammer, relationer, kardinalitet
- **Clean Code in JavaScript** — modulopbygning, læsbarhed, navngivning
- **Software Engineering** — systemdesign, arkitektur, teststrategier
- **Certified Tester Foundation Level (CTFL) v4.0** — testtyper, teststrategi

### Websider og artikler
- **MDN Web Docs (mozilla.org)** — HTML, CSS, DOM API, Fetch API, Web APIs
- **Hello World example — Express.js** — Express routing og middleware
- **Express/Node.js Introduction** og **Node.js — Express Framework** — server setup, routing, middleware
- **Richardson Maturity Model** — REST niveauer (Level 0–3), HTTP-metoder, ressource-design
- **How Did REST Come To Mean The Opposite of REST?** — RESTful API-principper og fejlfortolkninger
- **SQL vs NoSQL: The Differences** — begrundelse for valg af SQL frem for NoSQL
- **The Worlds of Database Systems** — databaseteori generelt
- **The Relational Model of Data** — relationsmodel, primær/fremmednøgler, normalisering

> Hvis der bruges viden UDENFOR disse kilder, skal det markeres tydeligt i koden med en kommentar og krediteres i rapporten.

---

## KODESTIL OG KOMMENTARER

### Kommentarregler (vigtigt)
- Kommentarer skal forklare **valg og fravalg**, ikke hvad koden gør linje for linje
- Kommentarer skal give mening **både teknisk og for en ikke-faglig læser**
- **Ingen bindestreger som opdeling** i kommentarer (f.eks. `// ---` er forbudt)
- Hold kommentarer **korte og præcise**
- Kommentarer skal stå ved **vigtige designbeslutninger**, ikke ved triviel kode

### Eksempel på god kommentar
```js
// Async/await frem for callbacks giver lineær læsbarhed (Eloquent JS kap. 11)
async function getProperty(address) { ... }
```

### Eksempel på dårlig kommentar
```js
// Henter ejendom fra databasen
// ----------------------------
const result = await db.query(...); // kører query
```

### Generelle principper (Clean Code in JavaScript)
- Sigende variabel- og funktionsnavne (ingen forkortelser som `d`, `tmp`, `res2`)
- Ét ansvar per funktion (Single Responsibility)
- Ingen "magic numbers" — brug navngivne konstanter
- Fejlhåndtering med `try/catch` og meningsfulde fejlmeddelelser
- Koden må ikke være repetitiv — genbrugbar logik samles i funktioner/moduler

---

## ARKITEKTUR OG FILSTRUKTUR

Tre-lags arkitektur som afspejler pensum:

```
projekt/
├── public/          # Frontend: HTML, CSS, client-side JS
│   ├── index.html
│   ├── style.css
│   └── app.js       # Fetch-kald til API, DOM-manipulation
├── routes/          # Express routes (API endpoints)
│   ├── properties.js
│   └── investments.js
├── models/          # Forretningslogik og databasekald
│   ├── propertyModel.js
│   └── investmentModel.js
├── database/        # DB-forbindelse og queries
│   └── db.js
├── .env             # Miljøvariabler (DB credentials, API keys)
├── index.js         # App entry point, Express setup
└── package.json
```

**Modellaget** er vigtigt: Det er her forretningslogik og SQL-kald lever, adskilt fra routing. API-laget (routes) er kun ansvarlig for at modtage request og sende response.

---

## API DESIGN (Richardson Maturity Model)

Stræb efter **Level 2** (HTTP-metoder + ressourcer):
- `GET /api/properties/:id` — henter ejendomsdata
- `POST /api/investments` — opretter en investeringscase
- `GET /api/investments/:id/simulation` — returnerer simuleringsresultat

Brug korrekte HTTP-statuskoder:
- `200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`

Dataudveksling altid i **JSON**.

---

## DATABASE (T-SQL / SQL Server)

- Normaliseret til **3NF** (Third Normal Form)
- Brug `PRIMARY KEY`, `FOREIGN KEY`, `NOT NULL` constraints
- Ingen data-redundans — gentagne data splittes i egne tabeller
- Parameteriserede queries (mod SQL injection) — aldrig string-concatenation i SQL
- ER-diagram skal dokumenteres og vedlægges som appendix i rapporten

---

## TEST (CTFL v4.0 + Software Engineering)

Tre testniveauer der skal dækkes:
1. **Unit tests** — test 3 kritiske moduler/funktioner isoleret
2. **Integration tests** — test at API og database kommunikerer korrekt
3. **Manuel test** — gennemgang af brugerrejsen

For hver unit test dokumenteres:
- Formål med enheden
- Teststrategi og test cases
- Edge cases og grænsetilfælde

Mindst **3 fejlscenarier** skal dokumenteres (fx invalid input, API-fejl, DB-fejl).

---

## KRAV TIL RAPPORT (eksamensrelevant)

Rapporten bedømmes på **refleksion og designbeslutninger**, ikke på antal features.

Kapitler:
1. **Analyse** — fortolkning af krav, identifikation af uklarheder, 2-3 kritiske designbeslutninger
2. **Design** — ER-diagram, forretningslogik i pseudokode, API-dokumentation (min. 2 endpoints med request/response eksempler), arkitekturbeskrivelse
3. **Implementation** — teststrategi, 3 unit tests, 3 fejlscenarier

**Rapporten må max være ~20-22 sider** med stærk analyse. Kvalitet > kvantitet.

---

## MUNDTLIG EKSAMEN

Vær forberedt på at forsvare:
- Valg af API-struktur (hvorfor netop de endpoints, de HTTP-metoder)
- Databasedesign (normaliseringsvalg, relationer)
- Frontend-arkitektur (hvordan data flyder fra fetch til DOM)
- Alternativerne — hvad ville du have gjort anderledes?
- Konkrete scenarier, fx: "Hvad sker der hvis to ejendomme har samme vejnavn i forskellige kommuner?"

---

## HVAD CLAUDE SKAL HUSKE NÅR VI UDVIKLER

1. Hold koden inden for det pensum der er listet ovenfor
2. Sig eksplicit hvis vi bruger noget UDENFOR pensum
3. Kommentarer følger reglerne ovenfor (korte, ingen bindestreger, valg/fravalg)
4. Ingen frontend-frameworks
5. Arkitekturen følger tre-lags modellen
6. SQL altid parameteriseret
7. JSON som dataudvekslingsformat
8. Fejlhåndtering med try/catch på alle async operationer
9. Koden må ikke være repetitiv — genbrugbar logik i moduler/funktioner
10. Ekstern kode skal krediteres i en kommentar
