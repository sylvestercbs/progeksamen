const express = require("express");
const router = express.Router();
const db = require("../models/database");

router.post("/", async (req, res) => {
  try {
    const { case_id, beskrivelse, beloeb, planlagt_aar } = req.body;

    if (!case_id || !beskrivelse || !beloeb || !planlagt_aar) {
      return res.status(400).json({ error: "Mangler påkrævede felter" });
    }

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Renovering
        (case_id, beskrivelse, beloeb, planlagt_aar)
       OUTPUT INSERTED.renovering_id
       VALUES (@case_id, @beskrivelse, @beloeb, @planlagt_aar)`,
      [
        { name: "case_id",      value: case_id },
        { name: "beskrivelse",  value: beskrivelse },
        { name: "beloeb",       value: beloeb },
        { name: "planlagt_aar", value: planlagt_aar },
      ]
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:case_id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM EjendomInvestApp.Renovering
       WHERE case_id = @case_id
       ORDER BY planlagt_aar ASC`,
      [{ name: "case_id", value: req.params.case_id }]
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM EjendomInvestApp.Renovering WHERE renovering_id = @id",
      [{ name: "id", value: req.params.id }]
    );
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Renovering ikke fundet" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
