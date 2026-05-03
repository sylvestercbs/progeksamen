"use strict";

// 1. Tomme variabler
let valgtAdresseId = null;
let valgtLon = null;
let valgtLat = null;
let valgtX25832 = null;
let valgtY25832 = null;
let valgtEjendomId = null;
let valgtVejnavn = null;
let valgtHusnummer = null;
let valgtPostnummer = null;
let valgtBynavn = null;

// 2. Opretter et kort
let map = L.map("map").setView([55.6761, 12.5683], 13);
let satelliteLayer = null;
let matrikelLayer = null;
let marker = null;

// 3. Gør adressefeltet intelligent med DAWA autocomplete
dawaAutocomplete.dawaAutocomplete(document.getElementById("adresse"), {
  select: async function(selected) {

    // 4. Når brugeren vælger adresse
    document.getElementById("valgtadresse").innerHTML = selected.tekst;

    valgtAdresseId  = selected.data.id;
    valgtLon        = selected.data.x;
    valgtLat        = selected.data.y;
    valgtVejnavn    = selected.data.vejnavn;
    valgtHusnummer  = selected.data.husnr;
    valgtPostnummer = selected.data.postnr;
    valgtBynavn     = selected.data.postnrnavn;

    const res = await fetch(selected.data.href + "?format=geojson&srid=25832");
    const adresse = await res.json();

    valgtX25832 = adresse.geometry.coordinates[0];
    valgtY25832 = adresse.geometry.coordinates[1];
  }
});

// 5. Når brugeren klikker "Hent ejendomsdata"
document.getElementById("bbr-knap").addEventListener("click", async function() {
  if (!valgtAdresseId) {
    alert("Vælg først en adresse");
    return;
  }

  const res = await fetch("/api/bbr?adresseId=" + valgtAdresseId);
  const data = await res.json();

  document.getElementById("profil-adresse").textContent = document.getElementById("valgtadresse").textContent;
  document.getElementById("profil-ejendomstype").textContent = data.ejendomstype || "Ikke tilgængeligt";
  document.getElementById("profil-byggeaar").textContent = data.byggeaar || "Ikke tilgængeligt";
  document.getElementById("profil-boligareal").textContent = data.boligareal || "Ikke tilgængeligt";
  document.getElementById("profil-vaerelser").textContent = data.antalVaerelser || "Ikke tilgængeligt";

  document.getElementById("ejendomsprofil").style.display = "block";

  const ejendomRes = await fetch('/api/ejendomme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eksternt_id:     valgtAdresseId,
      vejnavn:         valgtVejnavn,
      husnummer:       valgtHusnummer,
      postnummer:      valgtPostnummer,
      bynavn:          valgtBynavn,
      ejendomstype:    data.ejendomstype,
      byggeaar:        data.byggeaar,
      boligareal_m2:   data.boligareal,
      antal_vaerelser: data.antalVaerelser,
    })
  });
  const ejendom = await ejendomRes.json();
  valgtEjendomId = ejendom.ejendom_id;
  document.getElementById("case-formular").style.display = "block";
});

// Gemmer renovering og driftsposter lokalt i arrays indtil casen oprettes
const renoveringer = [];
const driftsposter = [];
const udlejningsposter = [];

// Hjælpefunktion der skjuler alle trin og viser kun det ønskede
function visTrin(nummer) {
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`trin-${i}`).style.display = i === nummer ? "block" : "none";
  }
  document.getElementById("trin-indikator").textContent = `Trin ${nummer} af 5`;
}

document.getElementById("trin1-naeste").addEventListener("click", function () {
  const navn = document.getElementById("case-navn").value.trim();
  const pris = document.getElementById("case-ejendomspris").value;
  if (!navn || !pris) {
    alert("Udfyld casenavn og ejendomspris");
    return;
  }
  visTrin(2);
});

document.getElementById("trin2-tilbage").addEventListener("click", () => visTrin(1));
document.getElementById("trin2-naeste").addEventListener("click", function () {
  const beloeb  = document.getElementById("laan-beloeb").value;
  const rente   = document.getElementById("laan-rente").value;
  const loebetid = document.getElementById("laan-loebetid").value;
  if (!beloeb || !rente || !loebetid) {
    alert("Udfyld lånebeløb, rente og løbetid");
    return;
  }
  visTrin(3);
});

document.getElementById("trin3-tilbage").addEventListener("click", () => visTrin(2));
document.getElementById("trin3-naeste").addEventListener("click", () => visTrin(4));

// Tilføjer renovering til lokal liste uden at gemme i database endnu
document.getElementById("renovering-tilfoej").addEventListener("click", function () {
  const beskrivelse = document.getElementById("renovering-beskrivelse").value.trim();
  const beloeb      = document.getElementById("renovering-beloeb").value;
  const aar         = document.getElementById("renovering-aar").value;
  if (!beskrivelse || !beloeb || !aar) {
    alert("Udfyld alle renoveringsfelter");
    return;
  }
  renoveringer.push({ beskrivelse, beloeb: parseFloat(beloeb), planlagt_aar: parseInt(aar) });
  const li = document.createElement("li");
  li.textContent = `${beskrivelse}: ${Number(beloeb).toLocaleString("da-DK")} kr. (år ${aar})`;
  document.getElementById("renovering-liste").appendChild(li);
  document.getElementById("renovering-beskrivelse").value = "";
  document.getElementById("renovering-beloeb").value = "";
  document.getElementById("renovering-aar").value = "";
});

document.getElementById("trin4-tilbage").addEventListener("click", () => visTrin(3));
document.getElementById("trin4-naeste").addEventListener("click", () => visTrin(5));

document.getElementById("drift-tilfoej").addEventListener("click", function () {
  const beskrivelse  = document.getElementById("drift-beskrivelse").value.trim();
  const beloeb       = document.getElementById("drift-beloeb").value;
  const er_maanedlig = document.getElementById("drift-frekvens").value;
  if (!beskrivelse || !beloeb) {
    alert("Udfyld beskrivelse og beløb");
    return;
  }
  driftsposter.push({ beskrivelse, beloeb: parseFloat(beloeb), er_maanedlig: parseInt(er_maanedlig) });
  const li = document.createElement("li");
  li.textContent = `${beskrivelse}: ${Number(beloeb).toLocaleString("da-DK")} kr. (${er_maanedlig === "1" ? "månedlig" : "årlig"})`;
  document.getElementById("drift-liste").appendChild(li);
  document.getElementById("drift-beskrivelse").value = "";
  document.getElementById("drift-beloeb").value = "";
});

document.getElementById("trin5-tilbage").addEventListener("click", () => visTrin(4));

document.getElementById("udlejning-tilfoej").addEventListener("click", function () {
  const posttype     = document.getElementById("udlejning-type").value;
  const beloeb       = document.getElementById("udlejning-beloeb").value;
  const er_maanedlig = document.getElementById("udlejning-frekvens").value;
  if (!beloeb) {
    alert("Udfyld beløb");
    return;
  }
  udlejningsposter.push({ posttype, beloeb: parseFloat(beloeb), er_maanedlig: parseInt(er_maanedlig) });
  const li = document.createElement("li");
  li.textContent = `${posttype}: ${Number(beloeb).toLocaleString("da-DK")} kr. (${er_maanedlig === "1" ? "månedlig" : "årlig"})`;
  document.getElementById("udlejning-liste").appendChild(li);
  document.getElementById("udlejning-beloeb").value = "";
});

// Opretter casen og alle tilknyttede poster i rækkefølge når brugeren klikker Opret
document.getElementById("opret-case-knap").addEventListener("click", async function () {
  const navn             = document.getElementById("case-navn").value.trim();
  const beskrivelse      = document.getElementById("case-beskrivelse").value.trim();
  const ejendomspris     = parseFloat(document.getElementById("case-ejendomspris").value);
  const koebs_omkostninger = parseFloat(document.getElementById("case-koebs-omkostninger").value) || 0;
  const laanebeloeb      = parseFloat(document.getElementById("laan-beloeb").value);
  const rentesats        = parseFloat(document.getElementById("laan-rente").value);
  const loebetid_aar     = parseInt(document.getElementById("laan-loebetid").value);
  const afdragsfri       = parseInt(document.getElementById("laan-afdragsfri").value) || 0;
  const laantype         = document.getElementById("laan-type").value;

  // Opretter selve casen først da alle andre poster refererer til case_id
  const caseRes = await fetch("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ejendom_id: valgtEjendomId,
      navn,
      beskrivelse,
      ejendomspris,
      koebs_omkostninger,
    })
  });
  const caseData = await caseRes.json();
  valgtEjendomId = caseData.case_id;

  // Opretter lånet med reference til den nye case
  await fetch("/api/laan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      case_id: caseData.case_id,
      laantype,
      laanebeloeb,
      rentesats,
      loebetid_aar,
      afdragsfri_periode_aar: afdragsfri,
    })
  });

  // Gemmer alle driftsposter og udlejningsposter der blev tilføjet undervejs
  for (const post of driftsposter) {
    await fetch("/api/driftsomkostninger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseData.case_id, ...post })
    });
  }

  for (const post of udlejningsposter) {
    await fetch("/api/udlejning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseData.case_id, ...post })
    });
  }

  document.getElementById("case-besked").textContent = "Case oprettet med ID: " + caseData.case_id;
  document.getElementById("simulering-formular").style.display = "block";

  // Udfylder simuleringsfelterne med de lånedata brugeren netop har indtastet
  document.getElementById("sim-laanebeloeb").value = laanebeloeb;
  document.getElementById("sim-rentesats").value   = rentesats;
  document.getElementById("sim-loebetid").value    = loebetid_aar;
});

// 7. Når brugeren klikker "Vis kort"
document.getElementById("kort-knap").addEventListener("click", function() {
  if (!valgtLon || !valgtLat) {
    alert("Vælg først en adresse");
    return;
  }

  map.setView([valgtLat, valgtLon], 17);

  if (satelliteLayer) map.removeLayer(satelliteLayer);
  if (matrikelLayer) map.removeLayer(matrikelLayer);
  if (marker) map.removeLayer(marker);

  const bounds = [
    [valgtLat - 0.002, valgtLon - 0.002],
    [valgtLat + 0.002, valgtLon + 0.002]
  ];

  satelliteLayer = L.imageOverlay(
    `/api/kort?type=satellit&x=${valgtLon}&y=${valgtLat}`,
    bounds
  ).addTo(map);

  if (valgtX25832 && valgtY25832) {
    matrikelLayer = L.imageOverlay(
      `/api/kort?type=matrikel&x=${valgtX25832}&y=${valgtY25832}`,
      bounds,
      { opacity: 1 }
    ).addTo(map);
  }

  marker = L.marker([valgtLat, valgtLon])
    .addTo(map)
    .bindPopup("Valgt ejendom")
    .openPopup();
});

// Holder Chart.js-instansen så den kan ødelægges og genskabes ved ny simulering
let simuleringsGraf = null;

document.getElementById("simuler-knap").addEventListener("click", async function () {
  const pris         = parseFloat(document.getElementById("sim-laanebeloeb").value);
  const laanebeloeb  = parseFloat(document.getElementById("sim-laanebeloeb").value);
  const rentesats    = parseFloat(document.getElementById("sim-rentesats").value);
  const loebetid_aar = parseInt(document.getElementById("sim-loebetid").value);
  const lejeindtaegt = parseFloat(document.getElementById("sim-lejeindtaegt").value);
  const udgifter     = parseFloat(document.getElementById("sim-udgifter").value);
  const antalAar     = parseInt(document.getElementById("sim-antal-aar").value);

  // Henter case-id fra den sidst oprettede case (sat via case-besked-elementet)
  const caseBesked = document.getElementById("case-besked").textContent;
  const caseId = caseBesked.match(/\d+/)?.[0];
  if (!caseId) {
    alert("Opret først en case");
    return;
  }

  // POST til /api/cases/:id/simulate — backend returnerer array af {aar, ejendomsvaerdi, cashflow}
  const res = await fetch(`/api/cases/${caseId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pris, laanebeloeb, rentesats, loebetid_aar, lejeindtaegt, udgifter, antalAar })
  });
  const resultater = await res.json();

  visSimulering(resultater);
});

function visSimulering(resultater) {
  document.getElementById("simulering-resultat").style.display = "block";

  const aar       = resultater.map(r => `År ${r.aar}`);
  const vaerdier  = resultater.map(r => Math.round(r.ejendomsvaerdi));
  const cashflows = resultater.map(r => Math.round(r.cashflow));
  const gaeld     = resultater.map(r => Math.round(r.restgaeld));
  const egenkapital = resultater.map(r => Math.round(r.egenkapital));

  if (simuleringsGraf) simuleringsGraf.destroy();

  const ctx = document.getElementById("simulering-graf").getContext("2d");

  simuleringsGraf = new Chart(ctx, {
    type: "line",
    data: {
      labels: aar,
      datasets: [
        {
          label: "Ejendomsværdi (kr.)",
          data: vaerdier,
          borderColor: "steelblue",
          tension: 0.1,
          yAxisID: "y"
        },
        {
          label: "Gæld (kr.)",
          data: gaeld,
          borderColor: "red",
          tension: 0.1,
          yAxisID: "y"
        },
        {
          label: "Egenkapital (kr.)",
          data: egenkapital,
          borderColor: "green",
          tension: 0.1,
          yAxisID: "y"
        },
        {
          label: "Årligt cashflow (kr.)",
          data: cashflows,
          borderColor: "orange",
          tension: 0.1,
          // Separat akse fordi cashflow er i en helt anden størrelsesorden end de andre
          yAxisID: "y1"
        }
      ]
    },
    options: {
      scales: {
        y:  { position: "left",  title: { display: true, text: "Kr." } },
        y1: { position: "right", title: { display: true, text: "Cashflow (kr.)" }, grid: { drawOnChartArea: false } }
      }
    }
  });

  // Tabel viser de samme tal som grafen men i læsbart format
  let html = "<table border='1'><tr><th>År</th><th>Ejendomsværdi</th><th>Gæld</th><th>Egenkapital</th><th>Cashflow</th></tr>";
  resultater.forEach(r => {
    html += `<tr>
      <td>${r.aar}</td>
      <td>${Math.round(r.ejendomsvaerdi).toLocaleString("da-DK")} kr.</td>
      <td>${Math.round(r.restgaeld).toLocaleString("da-DK")} kr.</td>
      <td>${Math.round(r.egenkapital).toLocaleString("da-DK")} kr.</td>
      <td>${Math.round(r.cashflow).toLocaleString("da-DK")} kr.</td>
    </tr>`;
  });
  html += "</table>";
  document.getElementById("simulering-tabel").innerHTML = html;
}