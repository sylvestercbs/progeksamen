// Integration tests verificerer at HTTP-laget og databasen kommunikerer korrekt (CTFL v4.0, afsnit 2.2)
// Ingen mocks — tests rammer den rigtige database for at afdække fejl i samspillet mellem lag
// Kræver at serveren kører: node src/server.js
// http-modulet er en del af Node.js core og kræver ingen installation

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const http = require("http");

const TESTSERVER_PORT = 3000;
// Unikt id pr. testkørsel forhindrer kollisioner i databasen ved gentagne kørsler
const UNIKT_TEST_ID = "TEST-INTEGRATION-" + Date.now();

// Azure SQL kan være langsom — timeout sættes højere end Jests standard på 5000ms
jest.setTimeout(10000);

let testEjendomId = null;
let testCaseId = null;

function httpAnmodning(method, sti, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: TESTSERVER_PORT,
      path: sti,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(options, (svar) => {
      let råData = "";
      svar.on("data", chunk => råData += chunk);
      svar.on("end", () => {
        try {
          resolve({ status: svar.statusCode, body: JSON.parse(råData) });
        } catch {
          resolve({ status: svar.statusCode, body: råData });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

afterAll(async () => {
  // Oprydning sikrer at testdata ikke forurener produktionsdatabasen
  if (testEjendomId) {
    await httpAnmodning("DELETE", `/api/ejendomme/${testEjendomId}`);
  }
});

test("POST /api/ejendomme opretter en ny ejendom i databasen og returnerer 201", async () => {
  const svar = await httpAnmodning("POST", "/api/ejendomme", {
    eksternt_id: UNIKT_TEST_ID,
    vejnavn: "Testvej",
    husnummer: "1",
    postnummer: "0000",
    bynavn: "Testby",
  });

  expect(svar.status).toBe(201);
  expect(svar.body).toHaveProperty("ejendom_id");
  testEjendomId = svar.body.ejendom_id;
});

// Fejlscenarie 1: manglende påkrævet felt skal afvises af API-laget med 400 — ikke crashe databasen
test("POST /api/ejendomme uden eksternt_id returnerer 400", async () => {
  const svar = await httpAnmodning("POST", "/api/ejendomme", {
    vejnavn: "Testvej",
  });
  expect(svar.status).toBe(400);
});

test("GET /api/ejendomme/:id henter den oprettede ejendom og returnerer 200", async () => {
  const svar = await httpAnmodning("GET", `/api/ejendomme/${testEjendomId}`);
  expect(svar.status).toBe(200);
  expect(svar.body.vejnavn).toBe("Testvej");
});

// Fejlscenarie 2: et id der ikke eksisterer skal returnere 404 — ikke en tom body eller serverfejl
test("GET /api/ejendomme/999999 returnerer 404 for ukendt id", async () => {
  const svar = await httpAnmodning("GET", "/api/ejendomme/999999");
  expect(svar.status).toBe(404);
});

// Fejlscenarie 3: idempotens — samme adresse må ikke oprettes to gange i databasen
test("POST /api/ejendomme med eksisterende eksternt_id returnerer 200 og samme ejendom_id", async () => {
  const svar = await httpAnmodning("POST", "/api/ejendomme", {
    eksternt_id: UNIKT_TEST_ID,
    vejnavn: "Testvej",
    husnummer: "1",
    postnummer: "0000",
    bynavn: "Testby",
  });

  expect(svar.status).toBe(200);
  expect(svar.body.ejendom_id).toBe(testEjendomId);
});

// CASES
test("POST /api/cases opretter en ny investeringscase og returnerer 201", async () => {
  const svar = await httpAnmodning("POST", "/api/cases", {
    ejendom_id: testEjendomId,
    navn: "Testkøb integration",
    beskrivelse: "Case oprettet af integrationstesten",
    ejendomspris: 2500000,
    koebs_omkostninger: 50000,
  });

  expect(svar.status).toBe(201);
  expect(svar.body).toHaveProperty("case_id");
  testCaseId = svar.body.case_id;
});

// Fejlscenarie 4: navn er påkrævet — API-laget skal afvise ufuldstændige data før de rammer databasen
test("POST /api/cases uden navn returnerer 400", async () => {
  const svar = await httpAnmodning("POST", "/api/cases", {
    ejendom_id: testEjendomId,
  });

  expect(svar.status).toBe(400);
});

test("GET /api/cases/:id henter den oprettede case og returnerer 200", async () => {
  const svar = await httpAnmodning("GET", `/api/cases/${testCaseId}`);

  expect(svar.status).toBe(200);
  expect(svar.body.navn).toBe("Testkøb integration");
});

// LAAN
test("POST /api/laan opretter et lån tilknyttet en case og returnerer 201", async () => {
  const svar = await httpAnmodning("POST", "/api/laan", {
    case_id: testCaseId,
    laantype: "Realkredit",
    laanebeloeb: 2000000,
    rentesats: 0.0425,
    loebetid_aar: 30,
    afdragsfri_periode_aar: 0,
  });

  expect(svar.status).toBe(201);
  expect(svar.body).toHaveProperty("laan_id");
});

// Fejlscenarie 5: ufuldstændige lånedata afvises — rentesats er nødvendig for annuitetsberegningen
test("POST /api/laan uden rentesats returnerer 400", async () => {
  const svar = await httpAnmodning("POST", "/api/laan", {
    case_id: testCaseId,
    laanebeloeb: 2000000,
  });

  expect(svar.status).toBe(400);
});

test("GET /api/laan/:case_id returnerer liste over lån for en case", async () => {
  const svar = await httpAnmodning("GET", `/api/laan/${testCaseId}`);

  expect(svar.status).toBe(200);
  expect(Array.isArray(svar.body)).toBe(true);
  expect(svar.body.length).toBeGreaterThan(0);
});

// UDLEJNING
test("POST /api/udlejning opretter en post og returnerer 201", async () => {
  const svar = await httpAnmodning("POST", "/api/udlejning", {
    case_id: testCaseId,
    posttype: "Lejeindtægt",
    beloeb: 10000,
    er_maanedlig: 1,
  });

  expect(svar.status).toBe(201);
  expect(svar.body).toHaveProperty("udlejning_id");
});

// Fejlscenarie 6: beloeb er undefined ved manglende felt — ikke 0, så valideringen fanger det korrekt
test("POST /api/udlejning uden posttype returnerer 400", async () => {
  const svar = await httpAnmodning("POST", "/api/udlejning", {
    case_id: testCaseId,
    beloeb: 10000,
  });

  expect(svar.status).toBe(400);
});

test("GET /api/udlejning/:case_id returnerer liste over poster for en case", async () => {
  const svar = await httpAnmodning("GET", `/api/udlejning/${testCaseId}`);

  expect(svar.status).toBe(200);
  expect(Array.isArray(svar.body)).toBe(true);
  expect(svar.body.length).toBeGreaterThan(0);
});

// Fejlscenarie 7: ugyldig datatype som case_id bryder databasens type-forventning og udløser 500
test("POST /api/laan med ugyldigt case_id returnerer 500", async () => {
  const svar = await httpAnmodning("POST", "/api/laan", {
    case_id: "IKKE-ET-TAL",
    laantype: "Realkredit",
    laanebeloeb: 2000000,
    rentesats: 0.0425,
    loebetid_aar: 30,
  });

  expect(svar.status).toBe(500);
});
