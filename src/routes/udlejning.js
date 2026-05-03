const express = require("express");
const router = express.Router();
const db = require("../models/database");

// Positivt beløb = indtægt, negativt beløb = udgift jf. databasedesign
router.post("/", async (req, res) => {
  try {
    const { case_id, posttype, beloeb, er_maanedlig } = req.body;

    if (!case_id || !posttype || beloeb === undefined) {
      return res.status(400).json({ error: "Mangler påkrævede felter" });
    }

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Udlejning 
        (case_id, posttype, beloeb, er_maanedlig)
       OUTPUT INSERTED.udlejning_id
       VALUES (@case_id, @posttype, @beloeb, @er_maanedlig)`,
      [
        { name: "case_id",      value: case_id },
        { name: "posttype",     value: posttype },
        { name: "beloeb",       value: beloeb },
        { name: "er_maanedlig", value: er_maanedlig !== undefined ? er_maanedlig : 1 },
      ]
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Returnerer månedligt og årligt overblik jf. krav
router.get("/:case_id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *,
        beloeb * CASE WHEN er_maanedlig = 1 THEN 12 ELSE 1 END AS aarligt_beloeb
       FROM EjendomInvestApp.Udlejning
       WHERE case_id = @case_id`,
      [{ name: "case_id", value: req.params.case_id }]
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;