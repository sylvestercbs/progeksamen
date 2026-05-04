# CLAUDE_CONTEXT.md
> Læs denne fil når du hjælper med udviklingen af dette projekt.
> Den definerer pensum, krav, kodestil og teknologier der er i spil.

---

## OM PROJEKTET

Vi bygger en **webapplikation til analyse og simulering af ejendomsinvesteringer** for private investorer.

Applikationen skal:
- Slå en registreret ejendom op og validere adressen via et **offentligt API**
- Hente og vise data om boligen
- Opstille en investeringscase (køb, finansiering, driftsbudget)
- Understøtte udlejningsscenarier (løbende ind- og udgifter)
- Vise en fremtidssimulering: cashflow, afdrag, værdiudvikling og nøgletal

Det er en prototype, ikke et finansprodukt. Fokus er på at simulere cases og gøre komplekse sammenhænge forståelige.

---

## TEKNISK STACK (krav fra opgaven)

| Lag | Teknologi |
|---|---|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Backend | Node.js med Express |
| Database | SQL Server via mssql pakken (Azure SQL) |
| Dataudveksling | JSON over HTTP |
| Test | Jest |

**Ingen JavaScript frontend-frameworks** (React, Vue, Angular etc.) er tilladt.

---

## PENSUM OG TILLADTE KILDER

Hold koden inden for den viden disse dækker. Hvis vi bruger noget udefra, markeres det i kode-kommentaren og nævnes i rapporten.

### Bøger
- **Eloquent JavaScript** — JS grundlag, typer, funktioner, asynkronitet (Promises, async/await), DOM, Fetch API (kap. 11, 18, 15)
- **T-SQL Fundamentals** — SQL queries, joins, transaktioner, normalisering
- **UML @ Classroom** — UML diagramtyper: use case, klasse, sekvens, aktivitet
- **Entity Relationship Modeling with UML** — ER-diagrammer, entiteter, attributter, relationer, kardinalitet, Crows Foot notation
- **Clean Code in JavaScript** — modulopbygning, læsbarhed, navngivning, Single Responsibility
- **Software Engineering (Sommerville)** — systemdesign, arkitektur, teststrategier
- **Certified Tester Foundation Level (CTFL) v4.0** — testtyper, teststrategi

### Websider og artikler
- **MDN Web Docs (mozilla.org)** — HTML, CSS, DOM API, Fetch API, HTTP status codes, Web APIs
- **Hello World example / Express.js docs** — Express routing og middleware
- **Node.js — Express Framework** og **Express/Node.js Introduction** — server setup, routing, middleware
- **Richardson Maturity Model** — REST niveauer (Level 0 til 3), HTTP-metoder, ressource-design
- **How Did REST Come To Mean The Opposite of REST?** — RESTful API-principper og fejlfortolkninger
- **SQL vs NoSQL: The Differences** — begrundelse for SQL frem for NoSQL
- **The Worlds of Database Systems** — databaseteori generelt
- **The Relational Model of Data** — relationsmodel, primær/fremmednøgler, normalisering

---

## KODESTIL OG KOMMENTARER

### Kommentarregler
- Kommentarer forklarer **valg og fravalg**, ikke hvad koden gør linje for linje
- Kommentarer skal give mening **både teknisk og for en ikke-faglig læser**
- **Ingen bindestreger som opdeling** (fx kommentarer bestående kun af streger er forbudt)
- Hold kommentarer **korte og præcise**
- Kommentarer sættes ved vigtige **designbeslutninger**

### Eksempel på god kommentar
```js
// async/await frem for callbacks giver lineær læsbarhed (Eloquent JS kap. 11)
async function getProperty(address) { ... }

// Parameteriseret query forhindrer SQL injection (forelæsning 22, mssql docs)
const result = await request.input('id', sql.Int, id).query('SELECT * FROM properties WHERE id = @id')
```

### Generelle principper (Clean Code in JavaScript)
- Sigende variabel- og funktionsnavne, ingen forkortelser som d, tmp, res2
- Ét ansvar per funktion (Single Responsibility Principle)
- Ingen magic numbers, brug navngivne konstanter
- Fejlhåndtering med try/catch på alle async operationer
- Ingen repetitiv kode, genbrugbar logik samles i funktioner/moduler

---

## ARKITEKTUR OG FILSTRUKTUR

Tre-lags arkitektur (pensum: forelæsning 18 og 19):

```
projekt/
├── public/               # Frontend: HTML, CSS, client-side JS
│   ├── index.html
│   ├── style.css
│   └── app.js            # fetch-kald til API, DOM-manipulation
├── routes/               # Express routes (API endpoints)
│   ├── properties.js
│   └── investments.js
├── database/             # DB-forbindelse og queries
│   ├── config.js         # Læser .env, eksporterer connection config
│   └── database.js       # Database-klasse med CRUD-metoder
├── .env                  # Miljøvariabler, ALDRIG i git
├── .gitignore            # .env og node_modules ekskluderes
├── index.js              # App entry point, Express setup
└── package.json
```

Modellaget (database.js) har al SQL-logik. Routes er kun ansvarlige for at modtage request og sende response, ingen forretningslogik i routes.

---

## HTML (forelæsning 8 og 9)

### Tags i pensum
```html
<html>, <head>, <body>, <title>, <meta>, <link>
<h1> til <h6>, <p>, <span>, <div>, <a>, <img>, <br>
<ul>, <ol>, <li>
<table>, <tr>, <td>, <th>
<!-- colspan og rowspan er pensum -->
<!-- <thead> og <tbody> er IKKE pensum men acceptabel udvidelse fra MDN/whatwg -->
<form>, <input>, <textarea>, <button>, <select>, <option>, <label>
<header>, <main>, <footer>, <nav>, <section>
<script>, <style>
```

### HTML attributter i pensum
id, class, src, href, type, name, value, placeholder, action, method, colspan, rowspan, alt

---

## CSS (forelæsning 8 og 9)

### Syntaks
```css
selektor { egenskab: værdi; }
```

### Selektorer i pensum
```css
p { color: red; }            /* element-selektor */
.highlight { color: blue; }  /* klasse-selektor */
#header { font-size: 24px; } /* ID-selektor */
button:hover { color: green; } /* pseudo-klasse (MDN) */
/* Cascading: parent-styling nedarves til children */
```

### CSS-egenskaber der er gennemgået
color, background-color, font-size, font-family, margin, padding, border, width, height, display, text-align, cursor

---

## DOM OG EVENTS (forelæsning 9 og 10)

### DOM-selektion
```js
document.getElementById("id")
document.getElementsByTagName("tag")
document.getElementsByClassName("classname")
document.querySelector("CSS-selektor")     // returnerer første match
document.querySelectorAll("CSS-selektor")  // returnerer alle match
```

### DOM-manipulation
```js
element.textContent = "ny tekst"
element.innerHTML = "<b>fed tekst</b>"
element.style.color = "red"
element.classList.add("aktiv")
element.classList.remove("aktiv")
element.setAttribute("src", "url")
document.createElement("div")
parent.appendChild(child)
parent.removeChild(child)
```

### Events
```js
element.addEventListener("click", (event) => {
  event.preventDefault()    // stopper browserens default adfærd
  event.stopPropagation()   // stopper event bubbling
})
// Typiske events i pensum: click, submit, change, input, keydown, mouseover
```

---

## ASYNKRONITET (Asynkronitet og Events forelæsning + Eloquent JS kap. 11)

### Callbacks
Ældste mønster. Kan give "pyramid of doom" ved kæder af asynkrone operationer.

### Promises
```js
fetch(url)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error))
```

### Async/Await (foretrukket i projektet)
```js
async function hentData(url) {
  try {
    const response = await fetch(url)
    const data = await response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}
```

En funktion med await skal have async foran. Async/await er "syntactic sugar" oven på Promises og returnerer altid et Promise. Brug async/await frem for .then-kæder, det giver lineær læsbarhed (Eloquent JS kap. 11).

---

## FETCH API (forelæsning 10, Eloquent JS s. 315, MDN)

```js
// GET
const response = await fetch("/api/properties/1")
const data = await response.json()

// POST med JSON body
const response = await fetch("/api/investments", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ address: "Nørrebrogade 1" })
})
const result = await response.json()
```

Fetch returnerer et Promise. Brug response.json() for JSON-svar. Tjek response.status for fejlhåndtering. Fetch erstatter det ældre XMLHttpRequest (synkront).

---

## NODE.JS OG EXPRESS (forelæsning 18 og 19)

### Server setup
```js
const express = require("express")
const app = express()

app.use(express.json())             // parser JSON request bodies
app.use(express.static("public"))   // server statiske filer fra public/

app.listen(3000, () => console.log("Server kører på port 3000"))
```

### De fire HTTP-metoder i pensum og CRUD-mapping
```js
// GET henter data (Read)
app.get("/api/items", async (req, res) => {
  const items = await database.getAll()
  res.status(200).json(items)
})

// GET med URL-parameter
app.get("/api/items/:id", async (req, res) => {
  const item = await database.getById(req.params.id)
  if (!item) return res.status(404).json({ error: "Ikke fundet" })
  res.status(200).json(item)
})

// POST opretter nyt (Create)
app.post("/api/items", async (req, res) => {
  const newItem = await database.create(req.body)
  res.status(201).json(newItem)
})

// PUT opdaterer eksisterende (Update)
app.put("/api/items/:id", async (req, res) => {
  await database.update(req.params.id, req.body)
  res.status(200).json({ message: "Opdateret" })
})

// DELETE sletter (Delete)
app.delete("/api/items/:id", async (req, res) => {
  await database.delete(req.params.id)
  res.status(200).json({ message: "Slettet" })
})
```

DELETE er idempotent: samme resultat uanset antal kald.

### CRUD og HTTP mapping (pensum)
| CRUD | HTTP | Statuskode |
|---|---|---|
| Create | POST | 201 Created |
| Read | GET | 200 OK |
| Update | PUT | 200 OK |
| Delete | DELETE | 200 OK |

### Test af endpoints i VS Code
Brug .http filer med REST Client extension (pensum fra forelæsning 18). GET kan testes i browser, POST/PUT/DELETE kræver Postman eller REST Client.

---

## HTTP STATUS CODES (forelæsning 10, 18, MDN)

Pensum kræver mindst 10 statuskoder bruges i projektet.

| Kode | Navn | Hvornår bruges den |
|---|---|---|
| 200 | OK | Succesfuldt GET, PUT eller DELETE |
| 201 | Created | Succesfuldt POST der oprettede noget |
| 400 | Bad Request | Manglende eller ugyldigt input fra klient |
| 401 | Unauthorized | Ikke logget ind |
| 403 | Forbidden | Logget ind men mangler rettigheder |
| 404 | Not Found | Ressourcen eksisterer ikke |
| 405 | Method Not Allowed | Forkert HTTP-metode på endpoint |
| 409 | Conflict | Duplikat ved oprettelse |
| 500 | Internal Server Error | Uventet fejl på server |
| 503 | Service Unavailable | Server kan ikke håndtere request |

---

## DATABASE (forelæsning 15, 16, 17, 19)

### Forbindelse med mssql og dotenv
```js
// config.js
require("dotenv").config()

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true }
}
module.exports = config
```

```js
// database.js, Database-klasse (mønster fra forelæsning 19)
const sql = require("mssql")

class Database {
  constructor(config) {
    this.config = config
    this.poolconnection = null
    this.connected = false
  }

  async connect() {
    try {
      this.poolconnection = await sql.connect(this.config)
      this.connected = true
    } catch (error) {
      this.connected = false
      throw error
    }
  }

  async disconnect() {
    try {
      if (this.connected) {
        await this.poolconnection.close()
        this.connected = false
      }
    } catch (error) {
      throw error
    }
  }
}
```

### SQL i pensum (forelæsning 15, 16, 17)

**DDL — Data Definition Language**
```sql
CREATE SCHEMA minDB;
GO

CREATE TABLE minDB.Properties (
  property_id INT NOT NULL,
  address VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  CONSTRAINT PK_property PRIMARY KEY (property_id)
);

ALTER TABLE minDB.Investments
  ADD CONSTRAINT FK_investment_property
  FOREIGN KEY (property_id) REFERENCES minDB.Properties(property_id);
```

**DML — Data Manipulation Language**
```sql
SELECT address, city
FROM minDB.Properties
WHERE city = 'København'
ORDER BY address ASC;

SELECT p.address, i.purchase_price
FROM minDB.Properties p
INNER JOIN minDB.Investments i ON p.property_id = i.property_id;

INSERT INTO minDB.Properties (address, city) VALUES ('Nørrebrogade 1', 'København');

UPDATE minDB.Properties SET city = 'Aarhus' WHERE property_id = 1;

DELETE FROM minDB.Properties WHERE property_id = 1;
```

**Aggregatfunktioner (pensum)**
COUNT, MAX, MIN, SUM, AVG

**Join typer i pensum**
INNER JOIN (= naturlig join uden redundante kolonner, EQUIJOIN når betingelse er lighed)

### Normalisering (forelæsning 16)
- **1NF** — alle kolonner er atomiske (én værdi per celle)
- **2NF** — 1NF + ingen partielle afhængigheder af primærnøglen
- **3NF** — 2NF + ingen transitive afhængigheder (non-key attributter afhænger kun af PK)

Projektet normaliseres til **3NF**.

### Parameteriserede queries, ALTID (forelæsning 22, mssql docs)
```js
// Korrekt, forhindrer SQL injection
const request = pool.request()
request.input("id", sql.Int, id)
const result = await request.query("SELECT * FROM Properties WHERE property_id = @id")

// Forkert, aldrig string-concatenation i SQL
const result = await pool.query("SELECT * FROM Properties WHERE id = " + id)
```

### Nøgler (forelæsning 15)
- **Primærnøgle (PK)** — unik udpegning af hver instans, ingen null-værdier
- **Fremmednøgle (FK)** — attribut der refererer til primærnøglen i en anden tabel, sikrer referential integrity

---

## API DESIGN (Richardson Maturity Model)

Stræb efter **Level 2** (ressourcebaserede URL'er + korrekte HTTP-metoder):

```
GET    /api/properties              hent alle ejendomme
GET    /api/properties/:id          hent én ejendom
POST   /api/investments             opret investeringscase
GET    /api/investments/:id         hent investeringscase
PUT    /api/investments/:id         opdater investeringscase
DELETE /api/investments/:id         slet investeringscase
GET    /api/investments/:id/simulation  hent simuleringsresultat
```

URL'er navngives med substantiver (ikke verber). Ressourcer i flertal. Data udveksles altid som JSON.

---

## UML DIAGRAMMER (forelæsning 13 og 14)

### Diagramtyper i pensum
- **Use Case diagram** — hvad systemet gør, hvem der bruger det. Primære aktører til venstre, sekundære til højre
- **Klassediagram** — hvad systemet består af. Klasser, attributter, metoder, associationer
- **Sekvensdiagram** — dialogen mellem aktør og system, kald og returbeskeder. Systemet behandles som en black box
- **Aktivitetsdiagram** — flow og processer
- **ER-diagram** — databeskrivelse med entiteter, attributter, relationer og kardinalitet

### ER-diagram notation (forelæsning 15)
Brug **Crow's Foot** eller **UML** notation, ikke Chen/diamant-notation.
Entiteter markeres med stereotype tagget Entity. Kardinalitet angives på relations-linjer (1, 0..1, 1..n, 0..n).

---

## TEST MED JEST (forelæsning 16)

### Installation
```json
"devDependencies": { "jest": "^29.0.0" },
"scripts": { "test": "jest", "test:coverage": "jest --coverage" }
```

### Arrange Act Assert mønster
```js
const { sum } = require("./sum")

test("lægger to tal sammen", () => {
  // Arrange
  const a = 2, b = 3
  // Act
  const result = sum(a, b)
  // Assert
  expect(result).toBe(5)
})
```

### Matchers i pensum
```js
expect(value).toBe(5)                        // strikt lighed
expect(value).toEqual({ id: 1 })             // dyb lighed for objekter
expect(array).toContain("element")           // indeholder element
expect(fn).toThrow("fejlbesked")             // kaster fejl
expect(fn).toHaveBeenCalled()                // mock blev kaldt
expect(fn).toHaveBeenCalledWith("argument")  // kaldt med specifikt argument
expect(fn).toHaveBeenCalledTimes(2)          // kaldt et bestemt antal gange
```

### Asynkrone tests
```js
test("returnerer data", async () => {
  await expect(checkStock("A1")).resolves.toBe(10)
})

test("fejler ved ukendt id", async () => {
  await expect(checkStock("X")).rejects.toThrow("Not found")
})
```

### Mocking
```js
// jest.fn() simulerer ekstern afhængighed
const service = { send: jest.fn() }
notify(service, "Hej")
expect(service.send).toHaveBeenCalledWith("Hej")

// jest.spyOn() overvåger eksisterende metode
jest.spyOn(database, "getById").mockResolvedValue({ id: 1 })
```

### Fake timers (pensum)
```js
jest.useFakeTimers()
runLater(cb)
jest.advanceTimersByTime(1000)
expect(cb).toHaveBeenCalled()
```

### Testtyper i projektet (krav fra eksamen)
1. **Unit test** — test 3 kritiske moduler isoleret, backend foretrukket da det er stabilt
2. **Integration test** — test at frontend kan kalde endpoints og får forventet svar
3. **Manuel test** — gennemgang af brugerrejsen

Mindst **3 fejlscenarier** dokumenteres: fx invalid input (400), manglende ressource (404), databasefejl (500).

### Coverage
```bash
npx jest --coverage
```

---

## TESTTYPER I PENSUM (CTFL v4.0 + Testing forelæsning)

- **Funktionel test** — tester hvad systemet gør
- **Ikke-funktionel test** — tester performance og sikkerhed
- **Regressionstest** — sikrer at nye ændringer ikke ødelægger eksisterende funktionalitet
- **Smoke test** — hurtig overordnet test af om systemet starter og svarer
- **Black-box test** — tester input/output uden kendskab til intern kode
- **Enhedstest** — det første testniveau, udføres inden integrationstest

---

## GIT (NodeJs og Debugging forelæsning)

```bash
git init
git clone <url>
git add <fil>
git add .
git commit -m "beskrivende besked"
git push origin main
git pull origin main
git branch <navn>
git checkout <navn>
git merge <navn>
git status
git log --merge        # se konflikter ved merge
git diff               # se forskelle
git merge --abort      # afbryd merge
```

.env og node_modules skal **altid** være i .gitignore.

---

## KRAV TIL RAPPORT

### Kapitel 1: Analyse
- Fortolkning af krav og identifikation af uklarheder
- 2-3 kritiske designbeslutninger med begrundelse

### Kapitel 2: Design
- ER-diagram normaliseret til 3NF
- Forretningslogik i pseudokode
- API-dokumentation for min. 2 endpoints med konkrete request og response eksempler
- Overordnet arkitekturbeskrivelse: tre lag, dataflow fra bruger til database og tilbage

### Kapitel 3: Implementation
- Overordnet teststrategi
- 3 unit tests dokumenteret med formål, strategi, testeksempel og edge cases
- 3 fejlscenarier dokumenteret

Max ca. 20-22 sider. Kvalitet og refleksion over designbeslutninger vægtes over kvantitet.

---

## HVAD CLAUDE SKAL HUSKE

1. Hold koden inden for det pensum der er listet her
2. Marker eksplicit i kommentar hvis noget er UDENFOR pensum
3. Kommentarer er korte, ingen bindestreger, forklarer valg og fravalg
4. Ingen frontend-frameworks
5. Tre-lags arkitektur: public, routes, database
6. SQL altid parameteriseret med request.input()
7. JSON som dataudvekslingsformat
8. try/catch på alle async operationer
9. Ingen repetitiv kode, genbrugbar logik i moduler
10. Korrekte HTTP-statuskoder altid
11. .env i .gitignore altid
12. Test skrives med Jest og Arrange-Act-Assert mønsteret
