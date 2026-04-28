const express = require("express");
const router = express.Router();
const db = require("../models/database");

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
    const { profil_id, navn, ejendomspris } = req.body;
    const result = await db.query(
      // OUTPUT INSERTED returnerer den nyoprettede række inkl. auto-genereret id (ekstern T-SQL viden)
      "INSERT INTO EjendomInvestApp.Investeringscase (profil_id, navn, ejendomspris) OUTPUT INSERTED.case_id VALUES (@profil_id, @navn, @ejendomspris)",
      [
        { name: "profil_id",    value: profil_id },
        { name: "navn",         value: navn },
        { name: "ejendomspris", value: ejendomspris }
      ]
    );
    // 201 Created signalerer at en ny ressource er oprettet
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
        { name: "id",           value: req.params.id }
      ]
    );
    res.json({ message: "Case opdateret" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;