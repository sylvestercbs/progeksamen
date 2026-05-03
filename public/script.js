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

// 6. Når brugeren klikker "Opret case"
document.getElementById("opret-case-knap").addEventListener("click", async function() {
  const navn = document.getElementById("case-navn").value.trim();
  if (!navn) {
    alert("Indtast et navn til casen");
    return;
  }

  const res = await fetch('/api/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ejendom_id:  valgtEjendomId,
      navn:        navn,
      beskrivelse: document.getElementById("case-beskrivelse").value.trim(),
    })
  });
  const data = await res.json();
  document.getElementById("case-besked").textContent = "Case oprettet med ID: " + data.case_id;
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

// Viser simuleringsformularen når en case er oprettet
// valgtEjendomId sættes i BBR-eventet og valgtCaseId sættes herunder
document.getElementById("opret-case-knap").addEventListener("click", async function () {
  // Bruger den allerede eksisterende case-oprettelse ovenfor i script.js
  // Formularen vises kun hvis oprettelsen lykkedes (valgtEjendomId er sat)
  if (valgtEjendomId) {
    document.getElementById("simulering-formular").style.display = "block";
  }
});

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

  const aar        = resultater.map(r => `År ${r.aar}`);
  const vaerdier   = resultater.map(r => Math.round(r.ejendomsvaerdi));
  const cashflows  = resultater.map(r => Math.round(r.cashflow));

  // Ødelægger tidligere graf så Canvas ikke fejler ved genkørsel
  if (simuleringsGraf) simuleringsGraf.destroy();

  const ctx = document.getElementById("simulering-graf").getContext("2d");

  // Chart.js opretter en linjegraf med to datasæt — ejendomsværdi og cashflow
  // Valg: linjegraf frem for søjlediagram fordi tidsudvikling over 30 år er lettere at aflæse
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
          label: "Årligt cashflow (kr.)",
          data: cashflows,
          borderColor: "green",
          tension: 0.1,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      // To y-akser fordi ejendomsværdi (millioner) og cashflow (tusinder) har meget forskellig skala
      scales: {
        y:  { position: "left",  title: { display: true, text: "Ejendomsværdi (kr.)" } },
        y1: { position: "right", title: { display: true, text: "Cashflow (kr.)" }, grid: { drawOnChartArea: false } }
      }
    }
  });

  // Tabel som fallback — tilgængelighed og eksamen-krav om tabel/diagram/graf
  let html = "<table border='1'><tr><th>År</th><th>Ejendomsværdi</th><th>Cashflow</th></tr>";
  resultater.forEach(r => {
    html += `<tr><td>${r.aar}</td><td>${Math.round(r.ejendomsvaerdi).toLocaleString("da-DK")} kr.</td><td>${Math.round(r.cashflow).toLocaleString("da-DK")} kr.</td></tr>`;
  });
  html += "</table>";
  document.getElementById("simulering-tabel").innerHTML = html;
}