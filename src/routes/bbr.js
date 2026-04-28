const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { adresseId } = req.query;
    if (!adresseId) {
      return res.status(400).json({ error: 'Mangler adresseId' });
    }

    const url = new URL('https://services.datafordeler.dk/BBR/BBRPublic/1/REST/enhed');
    url.searchParams.set('username', process.env.BBR_USERNAME);
    url.searchParams.set('password', process.env.BBR_PASSWORD);
    url.searchParams.set('AdresseIdentificerer', adresseId);
    url.searchParams.set('format', 'JSON');

    const response = await fetch(url.toString());
    const text = await response.text();
    console.log("BBR svar:", text);

    const data = JSON.parse(text);
    const enhed = data[0] || {};
    const resultat = {
      boligareal:     enhed.enh026EnhedensSamledeAreal || null,
      antalVaerelser: enhed['enh031AntalVærelser']      || null,
    };
    res.json(resultat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;