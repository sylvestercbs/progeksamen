const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.post('/', async (req, res) => {
  try {
    const { eksternt_id, vejnavn, husnummer, postnummer, bynavn,
            ejendomstype, byggeaar, boligareal_m2, antal_vaerelser } = req.body;

    if (!eksternt_id) return res.status(400).json({ error: 'Mangler adresse-ID' });

    const eksisterende = await db.query(
      'SELECT ejendom_id FROM EjendomInvestApp.Ejendom WHERE eksternt_id = @eksternt_id',
      [{ name: 'eksternt_id', value: eksternt_id }]
    );
    if (eksisterende.recordset.length > 0) {
      return res.status(200).json(eksisterende.recordset[0]);
    }

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Ejendom
         (eksternt_id, vejnavn, husnummer, postnummer, bynavn, ejendomstype, byggeaar, boligareal_m2, antal_vaerelser)
       OUTPUT INSERTED.ejendom_id
       VALUES (@eksternt_id, @vejnavn, @husnummer, @postnummer, @bynavn, @ejendomstype, @byggeaar, @boligareal_m2, @antal_vaerelser)`,
      [
        { name: 'eksternt_id',     value: eksternt_id },
        { name: 'vejnavn',         value: vejnavn },
        { name: 'husnummer',       value: husnummer },
        { name: 'postnummer',      value: postnummer },
        { name: 'bynavn',          value: bynavn },
        { name: 'ejendomstype',    value: ejendomstype },
        { name: 'byggeaar',        value: byggeaar },
        { name: 'boligareal_m2',   value: boligareal_m2 },
        { name: 'antal_vaerelser', value: antal_vaerelser },
      ]
    );

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
