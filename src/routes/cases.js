const express = require("express");
const router = express.Router();
const db = require("../models/database");
const InvestmentCalculator = require("../models/investmentCalculator");

// Henter alle cases fra databasen og returnerer dem som JSON
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM EjendomInvestApp.Investeringscase");
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

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Investeringscase (ejendom_id, navn, beskrivelse, ejendomspris, koebs_omkostninger)
       OUTPUT INSERTED.case_id
       VALUES (@ejendom_id, @navn, @beskrivelse, @ejendomspris, @koebs_omkostninger)`,
      [
        { name: 'ejendom_id',         value: ejendom_id },
        { name: 'navn',               value: navn },
        { name: 'beskrivelse',        value: beskrivelse },
        { name: 'ejendomspris',       value: ejendomspris || 0 },
        { name: 'koebs_omkostninger', value: koebs_omkostninger || 0 },
      ]
    );
    res.status(201).json(result.recordset[0]);
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
