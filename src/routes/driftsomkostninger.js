const express = require("express");
const router = express.Router();
const db = require("../models/database");

// Opretter en driftsomkostningspost — hver post er en separat række jf. 1NF
router.post("/", async (req, res) => {
  try {
    const { case_id, beskrivelse, beloeb, er_maanedlig } = req.body;

    if (!case_id || !beskrivelse || !beloeb) {
      return res.status(400).json({ error: "Mangler påkrævede felter" });
    }

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Driftsomkostning 
        (case_id, beskrivelse, beloeb, er_maanedlig)
       OUTPUT INSERTED.omkostning_id
       VALUES (@case_id, @beskrivelse, @beloeb, @er_maanedlig)`,
      [
        { name: "case_id",      value: case_id },
        { name: "beskrivelse",  value: beskrivelse },
        { name: "beloeb",       value: beloeb },
        // er_maanedlig defaulter til 1 (månedlig) hvis ikke angivet
        { name: "er_maanedlig", value: er_maanedlig !== undefined ? er_maanedlig : 1 },
      ]
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Henter alle driftsomkostninger for en case og beregner årligt totalt
router.get("/:case_id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *,
        beloeb * CASE WHEN er_maanedlig = 1 THEN 12 ELSE 1 END AS aarligt_beloeb
       FROM EjendomInvestApp.Driftsomkostning
       WHERE case_id = @case_id`,
      [{ name: "case_id", value: req.params.case_id }]
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
