const express = require('express');
const router = express.Router();

const EJENDOMSTYPER = {
  110: 'Stuehus til landbrugsejendom',
  120: 'Fritliggende enfamiliehus',
  121: 'Sammenbygget enfamiliehus',
  130: 'Rækkehus',
  140: 'Etageboligbebyggelse',
  190: 'Anden helårsbeboelse',
};

router.get('/', async (req, res) => {
  try {
    const { adresseId } = req.query;
    if (!adresseId) return res.status(400).json({ error: 'Mangler adresseId' });

    const base = 'https://services.datafordeler.dk/BBR/BBRPublic/1/REST';
    const auth = `username=${process.env.BBR_USERNAME}&password=${process.env.BBR_PASSWORD}`;

    const enhedRes = await fetch(`${base}/enhed?AdresseIdentificerer=${adresseId}&format=JSON&${auth}`);
    const enhedData = await enhedRes.json();
    // ÆNDRING 1: finder enheden med areal-data i stedet for bare [0]
    const enhed = enhedData.find(e => e.enh026EnhedensSamledeAreal) || enhedData[0] || {};

    let byggeaar = null;
    let ejendomstype = null;
    // ÆNDRING 2: flyttet ud af if-blokken så den er tilgængelig nedenfor
    let bygning = {};

    // ÆNDRING 3: bygning er en streng-GUID, ikke array — fjernet ?.[0]
    const bygningId = enhed.bygning || null;
    if (bygningId) {
      const bygningRes = await fetch(`${base}/bygning?id=${bygningId}&format=JSON&${auth}`);
      const bygningData = await bygningRes.json();
      bygning = bygningData[0] || {};
      byggeaar = bygning.byg026Opførelsesår || null;
      ejendomstype = EJENDOMSTYPER[bygning.byg021BygningensAnvendelse] || null;
    }

    res.json({
      // ÆNDRING 4: falder tilbage på bygningens areal hvis enheden ikke har det
      boligareal:     enhed.enh026EnhedensSamledeAreal || bygning.byg039BygningensSamledeBoligAreal || null,
      antalVaerelser: enhed['enh031AntalVærelser']      || null,
      byggeaar,
      ejendomstype,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;