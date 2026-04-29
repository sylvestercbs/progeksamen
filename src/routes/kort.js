const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { x, y, type } = req.query;

    if (!x || !y) {
      return res.status(400).json({ error: "Mangler koordinater" });
    }

    const token = process.env.DATAFORSYNINGEN_TOKEN;

    let service;
    let layer;
    let srs;
    let size;

    if (type === "matrikel") {
      service = "wms/cp_inspire";
      layer = "CP.CadastralParcel";
      srs = "EPSG:25832";
      size = 200; // meter
    } else {
      service = "orto_foraar_DAF";
      layer = "orto_foraar";
      srs = "EPSG:4326";
      size = 0.002; // grader
    }

    const minX = Number(x) - size;
    const minY = Number(y) - size;
    const maxX = Number(x) + size;
    const maxY = Number(y) + size;

    const url = new URL(`https://api.dataforsyningen.dk/${service}`);

    url.searchParams.set("SERVICE", "WMS");
    url.searchParams.set("VERSION", "1.1.1");
    url.searchParams.set("REQUEST", "GetMap");
    url.searchParams.set("FORMAT", "image/png");
    url.searchParams.set("TRANSPARENT", "TRUE");
    url.searchParams.set("LAYERS", layer);
    url.searchParams.set("STYLES", "");
    url.searchParams.set("WIDTH", "600");
    url.searchParams.set("HEIGHT", "600");
    url.searchParams.set("SRS", srs);
    url.searchParams.set("BBOX", `${minX},${minY},${maxX},${maxY}`);
    url.searchParams.set("token", token);

    console.log("Kalder kort API:", url.toString().replace(token, "SKJULT_TOKEN"));

    const response = await fetch(url.toString());

    if (!response.ok) {
      const text = await response.text();
      console.log("Kort API fejlede:", response.status);
      console.log(text);
      return res.status(500).json({ error: "Kort API fejl" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", "image/png");
    res.send(buffer);

  } catch (err) {
    console.log("Kort route fejl:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;