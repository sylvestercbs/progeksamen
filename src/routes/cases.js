const express = require("express");
const router = express.Router();
const db = require("../models/database");
const { InvestmentCalculator, Renovering } = require("../models/investmentCalculator");

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

    // Genbrug eksisterende profil hvis den findes — ellers opret én pr. ejendom
    const eksisterendeProfil = await db.query(
      `SELECT TOP 1 profil_id FROM EjendomInvestApp.Ejendomsprofil
       WHERE ejendom_id = @ejendom_id ORDER BY oprettet DESC`,
      [{ name: 'ejendom_id', value: ejendom_id }]
    );

    let profilId;
    if (eksisterendeProfil.recordset.length > 0) {
      profilId = eksisterendeProfil.recordset[0].profil_id;
    } else {
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
      profilId = profilResult.recordset[0].profil_id;
    }

    // Afvis hvis identisk case allerede eksisterer under samme profil
    const duplikatTjek = await db.query(
      `SELECT TOP 1 case_id FROM EjendomInvestApp.Investeringscase
       WHERE profil_id = @profil_id
         AND navn = @navn
         AND ISNULL(beskrivelse, '') = ISNULL(@beskrivelse, '')
         AND ejendomspris = @ejendomspris
         AND koebs_omkostninger = @koebs_omkostninger`,
      [
        { name: 'profil_id',          value: profilId },
        { name: 'navn',               value: navn },
        { name: 'beskrivelse',        value: beskrivelse || null },
        { name: 'ejendomspris',       value: ejendomspris || 0 },
        { name: 'koebs_omkostninger', value: koebs_omkostninger || 0 },
      ]
    );
    if (duplikatTjek.recordset.length > 0) {
      return res.status(409).json({
        error: 'Identisk case allerede oprettet',
        case_id: duplikatTjek.recordset[0].case_id
      });
    }

    // Opret Investeringscase med reference til den nye profil
    const caseResult = await db.query(
      `INSERT INTO EjendomInvestApp.Investeringscase (profil_id, navn, beskrivelse, ejendomspris, koebs_omkostninger)
       OUTPUT INSERTED.case_id
       VALUES (@profil_id, @navn, @beskrivelse, @ejendomspris, @koebs_omkostninger)`,
      [
        { name: 'profil_id',          value: profilId },
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

// Opdaterer alle redigerbare felter på en case
router.put("/:id", async (req, res) => {
  try {
    const { navn, beskrivelse, ejendomspris, koebs_omkostninger } = req.body;
    const result = await db.query(
      `UPDATE EjendomInvestApp.Investeringscase
       SET navn = COALESCE(@navn, navn), beskrivelse = COALESCE(@beskrivelse, beskrivelse),
           ejendomspris = @ejendomspris, koebs_omkostninger = COALESCE(@koebs_omkostninger, koebs_omkostninger)
       OUTPUT INSERTED.*
       WHERE case_id = @id`,
      [
        { name: "navn",               value: navn },
        { name: "beskrivelse",        value: beskrivelse },
        { name: "ejendomspris",       value: ejendomspris || 0 },
        { name: "koebs_omkostninger", value: koebs_omkostninger || 0 },
        { name: "id",                 value: req.params.id },
      ]
    );
    if (!result.recordset.length) return res.status(404).json({ error: "Case ikke fundet" });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplikerer en case inkl. lån, driftsomkostninger, udlejning og renoveringer
router.post("/:id/duplicate", async (req, res) => {
  try {
    const id = req.params.id;
    const [caseRes, laanRes, driftRes, udlejRes, renoRes] = await Promise.all([
      db.query("SELECT * FROM EjendomInvestApp.Investeringscase WHERE case_id = @id", [{ name: "id", value: id }]),
      db.query("SELECT * FROM EjendomInvestApp.Laan WHERE case_id = @id",             [{ name: "id", value: id }]),
      db.query("SELECT * FROM EjendomInvestApp.Driftsomkostning WHERE case_id = @id", [{ name: "id", value: id }]),
      db.query("SELECT * FROM EjendomInvestApp.Udlejning WHERE case_id = @id",        [{ name: "id", value: id }]),
      db.query("SELECT * FROM EjendomInvestApp.Renovering WHERE case_id = @id",       [{ name: "id", value: id }]),
    ]);

    if (!caseRes.recordset.length) return res.status(404).json({ error: "Case ikke fundet" });
    const orig = caseRes.recordset[0];

    const nyCase = await db.query(
      `INSERT INTO EjendomInvestApp.Investeringscase (profil_id, navn, beskrivelse, ejendomspris, koebs_omkostninger)
       OUTPUT INSERTED.case_id
       VALUES (@profil_id, @navn, @beskrivelse, @ejendomspris, @koebs_omkostninger)`,
      [
        { name: "profil_id",          value: orig.profil_id },
        { name: "navn",               value: orig.navn + " (kopi)" },
        { name: "beskrivelse",        value: orig.beskrivelse },
        { name: "ejendomspris",       value: orig.ejendomspris },
        { name: "koebs_omkostninger", value: orig.koebs_omkostninger },
      ]
    );
    const nyCaseId = nyCase.recordset[0].case_id;

    for (const l of laanRes.recordset) {
      await db.query(
        `INSERT INTO EjendomInvestApp.Laan (case_id, laantype, laanebeloeb, rentesats, loebetid_aar, afdragsfri_periode_aar)
         VALUES (@case_id, @laantype, @laanebeloeb, @rentesats, @loebetid_aar, @afdragsfri_periode_aar)`,
        [
          { name: "case_id",                value: nyCaseId },
          { name: "laantype",               value: l.laantype },
          { name: "laanebeloeb",            value: l.laanebeloeb },
          { name: "rentesats",              value: l.rentesats },
          { name: "loebetid_aar",           value: l.loebetid_aar },
          { name: "afdragsfri_periode_aar", value: l.afdragsfri_periode_aar },
        ]
      );
    }
    for (const d of driftRes.recordset) {
      await db.query(
        `INSERT INTO EjendomInvestApp.Driftsomkostning (case_id, beskrivelse, beloeb, er_maanedlig)
         VALUES (@case_id, @beskrivelse, @beloeb, @er_maanedlig)`,
        [
          { name: "case_id",      value: nyCaseId },
          { name: "beskrivelse",  value: d.beskrivelse },
          { name: "beloeb",       value: d.beloeb },
          { name: "er_maanedlig", value: d.er_maanedlig },
        ]
      );
    }
    for (const u of udlejRes.recordset) {
      await db.query(
        `INSERT INTO EjendomInvestApp.Udlejning (case_id, posttype, beloeb, er_maanedlig)
         VALUES (@case_id, @posttype, @beloeb, @er_maanedlig)`,
        [
          { name: "case_id",      value: nyCaseId },
          { name: "posttype",     value: u.posttype },
          { name: "beloeb",       value: u.beloeb },
          { name: "er_maanedlig", value: u.er_maanedlig },
        ]
      );
    }
    for (const r of renoRes.recordset) {
      await db.query(
        `INSERT INTO EjendomInvestApp.Renovering (case_id, beskrivelse, beloeb, planlagt_aar)
         VALUES (@case_id, @beskrivelse, @beloeb, @planlagt_aar)`,
        [
          { name: "case_id",      value: nyCaseId },
          { name: "beskrivelse",  value: r.beskrivelse },
          { name: "beloeb",       value: r.beloeb },
          { name: "planlagt_aar", value: r.planlagt_aar },
        ]
      );
    }

    res.status(201).json({ case_id: nyCaseId });
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

    const calculator = new InvestmentCalculator(invCase.ejendomspris, laan.laanebeloeb, laan.rentesats, laan.loebetid_aar, aarligUdlejn, aarligDrift, laan.afdragsfri_periode_aar || 0, Number(invCase.koebs_omkostninger) || 0);

    // Renoveringer fra DB konverteres til Renovering-objekter og tilføjes calculatoren
    renoveringer.forEach(r => calculator.tilfoejRenovering(new Renovering(r.planlagt_aar, Number(r.beloeb))));

    res.json(calculator.simuler(antalAar));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
