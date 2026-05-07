const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.post('/', async (req, res) => {
  try {
    const { eksternt_id, vejnavn, husnummer, postnummer, bynavn,
            ejendomstype, byggeaar, boligareal_m2, antal_vaerelser, grundareal_m2 } = req.body;

    if (!eksternt_id) return res.status(400).json({ error: 'Mangler adresse-ID' });

    const eksisterende = await db.query(
      'SELECT ejendom_id FROM EjendomInvestApp.Ejendom WHERE eksternt_id = @eksternt_id',
      [{ name: 'eksternt_id', value: eksternt_id }]
    );
    if (eksisterende.recordset.length > 0) {
      // Genindhentning: opdater BBR-felter + tidsstempel for sidste datahentning
      const opdateret = await db.query(
        `UPDATE EjendomInvestApp.Ejendom
         SET vejnavn = @vejnavn, husnummer = @husnummer, postnummer = @postnummer,
             bynavn = @bynavn, ejendomstype = @ejendomstype, byggeaar = @byggeaar,
             boligareal_m2 = @boligareal_m2, antal_vaerelser = @antal_vaerelser,
             grundareal_m2 = @grundareal_m2, sidst_hentet = GETDATE()
         OUTPUT INSERTED.ejendom_id
         WHERE eksternt_id = @eksternt_id`,
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
          { name: 'grundareal_m2',   value: grundareal_m2 },
        ]
      );
      return res.status(200).json(opdateret.recordset[0]);
    }

    const result = await db.query(
      `INSERT INTO EjendomInvestApp.Ejendom
         (eksternt_id, vejnavn, husnummer, postnummer, bynavn, ejendomstype, byggeaar, boligareal_m2, antal_vaerelser, grundareal_m2, sidst_hentet)
       OUTPUT INSERTED.ejendom_id
       VALUES (@eksternt_id, @vejnavn, @husnummer, @postnummer, @bynavn, @ejendomstype, @byggeaar, @boligareal_m2, @antal_vaerelser, @grundareal_m2, GETDATE())`,
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
        { name: 'grundareal_m2',   value: grundareal_m2 },
      ]
    );

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*,
        (SELECT COUNT(*)
         FROM EjendomInvestApp.Ejendomsprofil ep
         JOIN EjendomInvestApp.Investeringscase ic ON ic.profil_id = ep.profil_id
         WHERE ep.ejendom_id = e.ejendom_id) AS antal_cases
       FROM EjendomInvestApp.Ejendom e
       ORDER BY e.oprettet DESC`
    );
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM EjendomInvestApp.Ejendom WHERE ejendom_id = @id',
      [{ name: 'id', value: req.params.id }]
    );
    if (!result.recordset.length) return res.status(404).json({ error: 'Ejendom ikke fundet' });
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { vejnavn, husnummer, postnummer, bynavn, ejendomstype, byggeaar, boligareal_m2, antal_vaerelser, grundareal_m2 } = req.body;
    const result = await db.query(
      `UPDATE EjendomInvestApp.Ejendom
       SET vejnavn = @vejnavn, husnummer = @husnummer, postnummer = @postnummer,
           bynavn = @bynavn, ejendomstype = @ejendomstype, byggeaar = @byggeaar,
           boligareal_m2 = @boligareal_m2, antal_vaerelser = @antal_vaerelser,
           grundareal_m2 = @grundareal_m2
       OUTPUT INSERTED.*
       WHERE ejendom_id = @id`,
      [
        { name: 'vejnavn',         value: vejnavn },
        { name: 'husnummer',       value: husnummer },
        { name: 'postnummer',      value: postnummer },
        { name: 'bynavn',          value: bynavn },
        { name: 'ejendomstype',    value: ejendomstype },
        { name: 'byggeaar',        value: byggeaar },
        { name: 'boligareal_m2',   value: boligareal_m2 },
        { name: 'antal_vaerelser', value: antal_vaerelser },
        { name: 'grundareal_m2',   value: grundareal_m2 },
        { name: 'id',              value: req.params.id },
      ]
    );
    if (!result.recordset.length) return res.status(404).json({ error: 'Ejendom ikke fundet' });
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Slet i rækkefølge pga. FK-constraints: børn før forældre
    await db.query(`DELETE FROM EjendomInvestApp.Laan WHERE case_id IN (SELECT case_id FROM EjendomInvestApp.Investeringscase WHERE profil_id IN (SELECT profil_id FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id))`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Driftsomkostning WHERE case_id IN (SELECT case_id FROM EjendomInvestApp.Investeringscase WHERE profil_id IN (SELECT profil_id FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id))`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Udlejning WHERE case_id IN (SELECT case_id FROM EjendomInvestApp.Investeringscase WHERE profil_id IN (SELECT profil_id FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id))`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Renovering WHERE case_id IN (SELECT case_id FROM EjendomInvestApp.Investeringscase WHERE profil_id IN (SELECT profil_id FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id))`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Simulering WHERE case_id IN (SELECT case_id FROM EjendomInvestApp.Investeringscase WHERE profil_id IN (SELECT profil_id FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id))`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Investeringscase WHERE profil_id IN (SELECT profil_id FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id)`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Ejendomsprofil WHERE ejendom_id = @id`, [{ name: 'id', value: id }]);
    await db.query(`DELETE FROM EjendomInvestApp.Ejendom WHERE ejendom_id = @id`, [{ name: 'id', value: id }]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
