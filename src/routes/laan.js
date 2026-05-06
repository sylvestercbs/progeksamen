const express = require("express");
const router = express.Router();
const db = require("../models/database");
const { InvestmentCalculator } = require("../models/investmentCalculator");

// Opretter et lån tilknyttet en specifik case
router.post("/", async (req, res) => {
  try {
    const { case_id, laantype, laanebeloeb, rentesats, loebetid_aar, afdragsfri_periode_aar } = req.body;

    if (!case_id || !laanebeloeb || !rentesats || !loebetid_aar) {
      return res.status(400).json({ error: "Mangler påkrævede lånefelter" });
    }

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Laan 
        (case_id, laantype, laanebeloeb, rentesats, loebetid_aar, afdragsfri_periode_aar)
       OUTPUT INSERTED.laan_id
       VALUES (@case_id, @laantype, @laanebeloeb, @rentesats, @loebetid_aar, @afdragsfri_periode_aar)`,
      [
        { name: "case_id",                value: case_id },
        { name: "laantype",               value: laantype || "Realkredit" },
        { name: "laanebeloeb",            value: laanebeloeb },
        { name: "rentesats",              value: rentesats },
        { name: "loebetid_aar",           value: loebetid_aar },
        { name: "afdragsfri_periode_aar", value: afdragsfri_periode_aar || 0 },
      ]
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Henter alle lån for en case — tilføjer beregnet månedlig ydelse fra InvestmentCalculator
// så frontend ikke duplikerer annuitetsformlen
router.get("/:case_id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM EjendomInvestApp.Laan WHERE case_id = @case_id",
      [{ name: "case_id", value: req.params.case_id }]
    );
    const laanMedYdelse = result.recordset.map(l => {
      const calc = new InvestmentCalculator(0, l.laanebeloeb, l.rentesats, l.loebetid_aar, 0, 0);
      return { ...l, maanedlig_ydelse: calc.beregnMaanedligYdelse() };
    });
    res.json(laanMedYdelse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Opdaterer lånevilkår for et specifikt lån
router.put("/:id", async (req, res) => {
  try {
    const { laanebeloeb, rentesats, loebetid_aar, afdragsfri_periode_aar, laantype } = req.body;
    if (!laanebeloeb || !rentesats || !loebetid_aar) {
      return res.status(400).json({ error: "Mangler påkrævede lånefelter" });
    }
    const result = await db.query(
      `UPDATE EjendomInvestApp.Laan
       SET laanebeloeb = @laanebeloeb, rentesats = @rentesats,
           loebetid_aar = @loebetid_aar, afdragsfri_periode_aar = @afdragsfri_periode_aar,
           laantype = @laantype
       OUTPUT INSERTED.*
       WHERE laan_id = @id`,
      [
        { name: "laanebeloeb",            value: laanebeloeb },
        { name: "rentesats",              value: rentesats },
        { name: "loebetid_aar",           value: loebetid_aar },
        { name: "afdragsfri_periode_aar", value: afdragsfri_periode_aar || 0 },
        { name: "laantype",               value: laantype || "Realkredit" },
        { name: "id",                     value: req.params.id },
      ]
    );
    if (!result.recordset.length) return res.status(404).json({ error: "Lån ikke fundet" });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM EjendomInvestApp.Laan WHERE laan_id = @id",
      [{ name: "id", value: req.params.id }]
    );
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Lån ikke fundet" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;