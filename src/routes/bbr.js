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

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API fejlede (${res.status})`);
  return res.json();
}

router.get('/', async (req, res) => {
  try {
    const { adresseId } = req.query;
    if (!adresseId) return res.status(400).json({ error: 'Mangler adresseId' });

    const base = 'https://services.datafordeler.dk/BBR/BBRPublic/1/REST';
    const auth = `username=${process.env.BBR_USERNAME}&password=${process.env.BBR_PASSWORD}`;

    // Trin 1: Hent enhed fra BBR
    const enhedData = await apiFetch(`${base}/enhed?AdresseIdentificerer=${adresseId}&format=JSON&${auth}`);
    const enhed = enhedData.find(e => e.enh026EnhedensSamledeAreal) || enhedData[0] || {};

    // Trin 2: Hent bygning fra BBR via bygnings-ID på enheden
    let bygning = {};
    let byggeaar = null;
    let ejendomstype = null;
    const bygningId = enhed.bygning || null;
    if (bygningId) {
      const bygningData = await apiFetch(`${base}/bygning?id=${bygningId}&format=JSON&${auth}`);
      bygning = bygningData[0] || {};
      byggeaar = bygning.byg026Opførelsesår || null;
      ejendomstype = EJENDOMSTYPER[bygning.byg021BygningensAnvendelse] || null;
    }

    // Trin 3-5: Hent grundareal fra DAWA jordstykke
    // Grundareal ligger ikke i BBR men i Matriklen, tilgået via DAWA
    let grundArealM2 = null;
    const adresseData = await apiFetch(`https://api.dataforsyningen.dk/adresser/${adresseId}?format=json`);
    const adgangsadresseId = adresseData?.adgangsadresse?.id || null;

    if (adgangsadresseId) {
      const adgData = await apiFetch(`https://api.dataforsyningen.dk/adgangsadresser/${adgangsadresseId}?format=json`);
      const jordstykkeHref = adgData?.jordstykke?.href || null;

      if (jordstykkeHref) {
        const jordstykke = await apiFetch(`${jordstykkeHref}?format=json`);
        grundArealM2 = jordstykke?.registreretareal || null;
      }
    }

    res.json({
      boligareal:     enhed.enh026EnhedensSamledeAreal || bygning.byg039BygningensSamledeBoligAreal || null,
      antalVaerelser: enhed['enh031AntalVærelser']      || null,
      byggeaar,
      ejendomstype,
      grundArealM2,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ejendomsdata kunne ikke hentes', message: err.message });
  }
});

module.exports = router;
