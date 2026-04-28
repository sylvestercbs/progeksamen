const express = require('express');
const router = express.Router();

// GET /api/bbr?adresse=Vesterbrogade 1, 1620 København
router.get('/', async (req, res) => {
  const { id } = req.query;

console.log('Query modtaget:', req.query); // tilføj denne linje

  if (!id) {
    return res.status(400).json({ error: 'Mangler adresse-parameter' });
  }

  try {
    const url = new URL('https://services.datafordeler.dk/BBR/BBRPublic/1/REST/enhed');
    url.searchParams.set('username', process.env.BBR_USERNAME);
    url.searchParams.set('password', process.env.BBR_PASSWORD);
    url.searchParams.set('id', id);
    url.searchParams.set('format', 'JSON');

    const response = await fetch(url.toString());

    if (!response.ok) {
  const errorText = await response.text();
  console.log('BBR status:', response.status, errorText);
  return res.status(response.status).json({ error: 'Fejl fra BBR API' });
}

    const data = await response.json();

    console.log('BBR rå data:', JSON.stringify(data[0]));

    // Udtræk kun de felter vi skal bruge til eksamen
    const ejendom = (data[0] || {});
    const resultat = {
      byggeaar:       ejendom.opforelsesAar        || null,
      boligareal:     ejendom.etagetBygAreal        || null,
      antalVaerelser: ejendom.antalVaerelserBolig   || null,
      grundareal:     ejendom.grundAreal            || null,
      ejendomstype:   ejendom.bygnAnvKode           || null,
    };

    res.json(resultat);

  } catch (err) {
    console.error('BBR fejl:', err.message);
    res.status(500).json({ error: 'Serverfejl ved BBR-opslag' });
  }
});

module.exports = router;