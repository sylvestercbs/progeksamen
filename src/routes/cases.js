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
        { name: "ejendomspris", value: ejendomspris },
        { name: "id",           value: req.params.id },
        { name: "ejendomspris",       value: ejendomspris || 0 },
        { name: "koebs_omkostninger", value: koebs_omkostninger || 0 },
      ]
    );
    res.json({ message: "Case opdateret" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Opretter en InvestmentCalculator med lånedata og returnerer simulerede resultater pr. år
    router.post("/:id/simulate", async (req, res) => {
        try {
         const { pris, laanebeloeb, rentesats, loebetid_aar, lejeindtaegt, udgifter, antalAar } = req.body;
    
        const calculator = new InvestmentCalculator(pris, laanebeloeb, rentesats, loebetid_aar);
        const resultater = calculator.simuler(antalAar, lejeindtaegt, udgifter);
    
        res.status(200).json(resultater);
     } catch (err) {
        res.status(500).json({ error: err.message });
    }
    });

module.exports = router;
