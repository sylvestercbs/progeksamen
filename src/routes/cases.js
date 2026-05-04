const express = require("express");
const router = express.Router();
const db = require("../models/database");
const InvestmentCalculator = require("../models/investmentCalculator");

// Henter cases — filtrerer på ejendom_id hvis query param er angivet
router.get("/", async (req, res) => {
  try {
    let result;
    if (req.query.ejendom_id) {
      result = await db.query(
        `SELECT ic.* FROM EjendomInvestApp.Investeringscase ic
         JOIN EjendomInvestApp.Ejendomsprofil ep ON ic.profil_id = ep.profil_id
         WHERE ep.ejendom_id = @ejendom_id`,
        [{ name: "ejendom_id", value: req.query.ejendom_id }]
      );
    } else {
      result = await db.query("SELECT * FROM EjendomInvestApp.Investeringscase");
    }
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @id i URL matches med case_id i databasen via parameteriseret query
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM EjendomInvestApp.Investeringscase WHERE case_id = @id",
      [{ name: "id", value: req.params.id }]
    );
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// req.body indeholder data sendt fra frontend som JSON
router.post("/", async (req, res) => {
  try {
    const { ejendom_id, navn, beskrivelse, ejendomspris, koebs_omkostninger } = req.body;

    if (!navn) return res.status(400).json({ error: 'Navn er påkrævet' });
    if (!ejendom_id) return res.status(400).json({ error: 'ejendom_id er påkrævet' });

    // Opret Ejendomsprofil først — Investeringscase kræver en profil_id (FK til Ejendomsprofil)
    const profilResult = await db.query(
      `INSERT INTO EjendomInvestApp.Ejendomsprofil (ejendom_id, navn, beskrivelse)
       OUTPUT INSERTED.profil_id
       VALUES (@ejendom_id, @navn, @beskrivelse)`,
      [
        { name: 'ejendom_id',  value: ejendom_id },
        { name: 'navn',        value: navn },
        { name: 'beskrivelse', value: beskrivelse },
      ]
    );
    const profil_id = profilResult.recordset[0].profil_id;

    // Opret Investeringscase med reference til den nye profil
    const caseResult = await db.query(
      `INSERT INTO EjendomInvestApp.Investeringscase (profil_id, navn, beskrivelse, ejendomspris, koebs_omkostninger)
       OUTPUT INSERTED.case_id
       VALUES (@profil_id, @navn, @beskrivelse, @ejendomspris, @koebs_omkostninger)`,
      [
        { name: 'profil_id',          value: profil_id },
        { name: 'navn',               value: navn },
        { name: 'beskrivelse',        value: beskrivelse },
        { name: 'ejendomspris',       value: ejendomspris || 0 },
        { name: 'koebs_omkostninger', value: koebs_omkostninger || 0 },
      ]
    );
    res.status(201).json(caseResult.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Opdaterer kun navn og pris, id kommer fra URL og ikke request body
router.put("/:id", async (req, res) => {
  try {
    const { navn, ejendomspris } = req.body;
    await db.query(
      "UPDATE EjendomInvestApp.Investeringscase SET navn = @navn, ejendomspris = @ejendomspris WHERE case_id = @id",
      [
        { name: "navn",         value: navn },
        { name: "ejendomspris", value: ejendomspris || 0 },
        { name: "id",           value: req.params.id },
      ]
    );
    res.json({ message: "Case opdateret" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Henter al gemt data for casen fra DB og simulerer — kun antalAar kommer fra frontend
router.post("/:id/simulate", async (req, res) => {
  try {
    const { antalAar = 30 } = req.body;
    const id = req.params.id;

    const [caseRes, laanRes, driftRes, udlejRes, renoRes] = await Promise.all([
      db.query(
        "SELECT * FROM EjendomInvestApp.Investeringscase WHERE case_id = @id",
        [{ name: "id", value: id }]
      ),
      db.query(
        "SELECT * FROM EjendomInvestApp.Laan WHERE case_id = @id",
        [{ name: "id", value: id }]
      ),
      db.query(
        `SELECT beloeb * CASE WHEN er_maanedlig=1 THEN 12 ELSE 1 END AS aarligt
         FROM EjendomInvestApp.Driftsomkostning WHERE case_id = @id`,
        [{ name: "id", value: id }]
      ),
      db.query(
        `SELECT beloeb * CASE WHEN er_maanedlig=1 THEN 12 ELSE 1 END AS aarligt
         FROM EjendomInvestApp.Udlejning WHERE case_id = @id`,
        [{ name: "id", value: id }]
      ),
      // Henter renoveringer med beloeb og planlagt_aar til brug i simuler()
      db.query(
        "SELECT beloeb, planlagt_aar FROM EjendomInvestApp.Renovering WHERE case_id = @id",
        [{ name: "id", value: id }]
      ),
    ]);

    if (!caseRes.recordset.length) return res.status(404).json({ error: "Case ikke fundet" });
    if (!laanRes.recordset.length) return res.status(409).json({ error: "Casen mangler et lån" });

    const invCase      = caseRes.recordset[0];
    const laan         = laanRes.recordset[0];
    const aarligDrift  = driftRes.recordset.reduce((sum, r) => sum + Number(r.aarligt), 0);
    const aarligUdlejn = udlejRes.recordset.reduce((sum, r) => sum + Number(r.aarligt), 0);
    const renoveringer = renoRes.recordset;

    const calculator = new InvestmentCalculator(invCase.ejendomspris, laan.laanebeloeb, laan.rentesats, laan.loebetid_aar);

    // Udlejning er positiv (indtægt), drift er negativ (udgift)
    // renoveringer fratrækkes i simuler() det år de er planlagt
    res.json(calculator.simuler(antalAar, aarligUdlejn, aarligDrift, renoveringer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
