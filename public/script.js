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
let map = L.map("map", { zoomControl: false }).setView([55.6761, 12.5683], 15); // Fjerner zoom-knapper fra kortet
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

  document.getElementById("bbr-fejl").style.display = "none";
  let res, data;
  try {
    res = await fetch("/api/bbr?adresseId=" + valgtAdresseId);
    if (!res.ok) throw new Error("API svarede med " + res.status);
    data = await res.json();
  } catch (err) {
    document.getElementById("bbr-fejl").textContent = "Kunne ikke hente BBR-data — prøv igen eller udfyld manuelt.";
    document.getElementById("bbr-fejl").style.display = "block";
    return;
  }

  document.getElementById("profil-adresse").textContent = document.getElementById("valgtadresse").textContent;
  document.getElementById("profil-ejendomstype").textContent = data.ejendomstype || "Ikke tilgængeligt";
  document.getElementById("profil-byggeaar").textContent = data.byggeaar || "Ikke tilgængeligt";
  document.getElementById("profil-boligareal").textContent = data.boligareal || "Ikke tilgængeligt";
  document.getElementById("profil-vaerelser").textContent = data.antalVaerelser || "Ikke tilgængeligt";
  document.getElementById("profil-grundareal").textContent = data.grundArealM2 || "Ikke tilgængeligt";

  // Nulstil formular og arrays fra forrige søgning
  document.getElementById("case-navn").value = "";
  document.getElementById("case-beskrivelse").value = "";
  document.getElementById("case-ejendomspris").value = "";
  document.getElementById("case-koebs-omkostninger").value = "";
  document.getElementById("laan-beloeb").value = "";
  document.getElementById("laan-rente").value = "";
  document.getElementById("laan-loebetid").value = "";
  document.getElementById("laan-afdragsfri").value = "0";
  document.getElementById("renovering-liste").innerHTML = "";
  document.getElementById("drift-liste").innerHTML = "";
  document.getElementById("drift-total").style.display = "none";
  document.getElementById("udlejning-liste").innerHTML = "";
  document.getElementById("case-besked").textContent = "";
  document.getElementById("sim-sektion").style.display = "none";
  document.getElementById("sim-resultat").style.display = "none";
  renoveringer.length = 0;
  driftsposter.length = 0;
  udlejningsposter.length = 0;
  laaner.length = 0;
  document.getElementById("laan-liste").innerHTML = "";

  // Sæt første tab aktiv
  document.querySelectorAll(".tab-knap").forEach(k => k.classList.remove("aktiv"));
  document.querySelectorAll(".tab-indhold").forEach(t => t.classList.remove("aktiv"));
  document.querySelector(".tab-knap[data-tab='tab-koeb']").classList.add("aktiv");
  document.getElementById("tab-koeb").classList.add("aktiv");

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
      grundareal_m2:   data.grundArealM2,
    })
  });
  const ejendom = await ejendomRes.json();
  valgtEjendomId = ejendom.ejendom_id;
  document.getElementById("case-formular").style.display = "block";
  visKort();
});

// Gemmer renovering og driftsposter lokalt i arrays indtil casen oprettes
const renoveringer = [];
const driftsposter = [];
const udlejningsposter = [];
const laaner = [];


document.getElementById("renovering-tilfoej").addEventListener("click", function () {
  const beskrivelse = document.getElementById("renovering-beskrivelse").value.trim();
  const beloeb      = document.getElementById("renovering-beloeb").value;
  const aar         = document.getElementById("renovering-aar").value;
  if (!beskrivelse || !beloeb || !aar) { alert("Udfyld alle renoveringsfelter"); return; }
  renoveringer.push({ beskrivelse, beloeb: parseFloat(beloeb), planlagt_aar: parseInt(aar) });
  const li = document.createElement("li");
  li.textContent = `${beskrivelse}: ${Number(beloeb).toLocaleString("da-DK")} kr. (år ${aar})`;
  document.getElementById("renovering-liste").appendChild(li);
  document.getElementById("renovering-beskrivelse").value = "";
  document.getElementById("renovering-beloeb").value = "";
  document.getElementById("renovering-aar").value = "";
});


document.getElementById("drift-tilfoej").addEventListener("click", function () {
  const beskrivelse  = document.getElementById("drift-beskrivelse").value.trim();
  const beloeb       = document.getElementById("drift-beloeb").value;
  const erMaanedlig = document.getElementById("drift-frekvens").value;
  if (!beskrivelse || !beloeb) { alert("Udfyld beskrivelse og beløb"); return; }
  driftsposter.push({ beskrivelse, beloeb: parseFloat(beloeb), er_maanedlig: parseInt(erMaanedlig) });
  const li = document.createElement("li");
  li.textContent = `${beskrivelse}: ${Number(beloeb).toLocaleString("da-DK")} kr. (${erMaanedlig === "1" ? "månedlig" : "årlig"})`;
  document.getElementById("drift-liste").appendChild(li);
  document.getElementById("drift-beskrivelse").value = "";
  document.getElementById("drift-beloeb").value = "";
  opdaterDriftsTotal();
});

function opdaterDriftsTotal() {
  let aarligTotal = 0;
  for (let i = 0; i < driftsposter.length; i++) {
    aarligTotal += driftsposter[i].er_maanedlig ? driftsposter[i].beloeb * 12 : driftsposter[i].beloeb;
  }
  document.getElementById("drift-total-maaned").textContent = Math.round(aarligTotal / 12).toLocaleString("da-DK");
  document.getElementById("drift-total-aar").textContent    = Math.round(aarligTotal).toLocaleString("da-DK");
  document.getElementById("drift-total").style.display = "block";
}

document.getElementById("udlejning-tilfoej").addEventListener("click", function () {
  const posttype     = document.getElementById("udlejning-type").value;
  const beloeb       = document.getElementById("udlejning-beloeb").value;
  const erMaanedlig = document.getElementById("udlejning-frekvens").value;
  if (!beloeb) { alert("Udfyld beløb"); return; }
  udlejningsposter.push({ posttype, beloeb: parseFloat(beloeb), er_maanedlig: parseInt(erMaanedlig) });
  const li = document.createElement("li");
  li.textContent = `${posttype}: ${Number(beloeb).toLocaleString("da-DK")} kr. (${erMaanedlig === "1" ? "månedlig" : "årlig"})`;
  document.getElementById("udlejning-liste").appendChild(li);
  document.getElementById("udlejning-beloeb").value = "";
});

document.getElementById("laan-tilfoej").addEventListener("click", function () {
  const beloeb      = parseFloat(document.getElementById("laan-beloeb").value);
  const rentesats   = parseFloat(document.getElementById("laan-rente").value);
  const loebetidAar = parseInt(document.getElementById("laan-loebetid").value);
  const afdragsfri  = parseInt(document.getElementById("laan-afdragsfri").value) || 0;
  const laantype    = document.getElementById("laan-type").value;
  if (!beloeb || !rentesats || !loebetidAar) { alert("Udfyld lånebeløb, rentesats og løbetid"); return; }
  laaner.push({ laanebeloeb: beloeb, rentesats, loebetid_aar: loebetidAar, afdragsfri_periode_aar: afdragsfri, laantype });
  const li = document.createElement("li");
  li.textContent = `${laantype}: ${beloeb.toLocaleString("da-DK")} kr., ${rentesats * 100}% i ${loebetidAar} år`;
  document.getElementById("laan-liste").appendChild(li);
  document.getElementById("laan-beloeb").value = "";
  document.getElementById("laan-rente").value = "";
  document.getElementById("laan-loebetid").value = "";
  document.getElementById("laan-afdragsfri").value = "0";
});

// Opretter casen og alle tilknyttede poster når brugeren klikker Opret
document.getElementById("opret-case-knap").addEventListener("click", async function () {
  const navn              = document.getElementById("case-navn").value.trim();
  const beskrivelse       = document.getElementById("case-beskrivelse").value.trim();
  const ejendomspris      = parseFloat(document.getElementById("case-ejendomspris").value);
  const koebsOmkostninger = parseFloat(document.getElementById("case-koebs-omkostninger").value) || 0;

  document.getElementById("case-besked").style.color = "";

  if (!navn || !ejendomspris || laaner.length === 0) {
    alert("Udfyld casenavn, ejendomspris og tilføj mindst ét lån");
    return;
  }

  const caseRes = await fetch("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ejendom_id: valgtEjendomId, navn, beskrivelse, ejendomspris, koebs_omkostninger: koebsOmkostninger })
  });

  if (caseRes.status === 409) {
    const fejlData = await caseRes.json();
    document.getElementById("case-besked").textContent =
      `En identisk case er allerede oprettet (ID: ${fejlData.case_id}) — rediger formularen for at oprette en ny.`;
    document.getElementById("case-besked").style.color = "#c0392b";
    return;
  }

  const caseData = await caseRes.json();

  for (const laan of laaner) {
    await fetch("/api/laan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseData.case_id, ...laan })
    });
  }

  for (const post of renoveringer) {
    await fetch("/api/renoveringer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseData.case_id, ...post })
    });
  }

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
  document.getElementById("sim-sektion").style.display = "block";

  // Udfylder simuleringsfelterne automatisk med data fra formularen
  document.getElementById("sim-ejendomspris").value = ejendomspris;
  document.getElementById("sim-laanebeloeb").value  = laaner[0].laanebeloeb;
  document.getElementById("sim-rentesats").value    = laaner[0].rentesats;
  document.getElementById("sim-loebetid").value     = laaner[0].loebetid_aar;
  document.getElementById("sim-lejeindtaegt").value = udlejningsposter.reduce((sum, p) => sum + p.beloeb * (p.er_maanedlig ? 12 : 1), 0);
  document.getElementById("sim-udgifter").value     = driftsposter.reduce((sum, p) => sum + p.beloeb * (p.er_maanedlig ? 12 : 1), 0);
});

function visKort() {
  if (satelliteLayer) map.removeLayer(satelliteLayer);
  if (matrikelLayer) map.removeLayer(matrikelLayer);
  if (marker) map.removeLayer(marker);

  const bounds = [
    [valgtLat - 0.002, valgtLon - 0.002],
    [valgtLat + 0.002, valgtLon + 0.002]
  ];

  const zoom = map.getBoundsZoom(bounds) + 2;
  map.setView([valgtLat, valgtLon], zoom);

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
}

function skiftTab(delta) {
  const knapper = [...document.querySelectorAll(".tab-knap")];
  const aktivIndex = knapper.findIndex(k => k.classList.contains("aktiv"));
  const naesteIndex = aktivIndex + delta;
  if (naesteIndex >= 0 && naesteIndex < knapper.length) {
    knapper[naesteIndex].click();
    document.getElementById("case-formular").scrollIntoView({ behavior: "smooth" });
  }
}

// Skifter aktiv tab ved klik — tilføjer og fjerner CSS-klassen "aktiv"
document.querySelectorAll(".tab-knap").forEach(knap => {
  knap.addEventListener("click", function () {
    document.querySelectorAll(".tab-knap").forEach(k => k.classList.remove("aktiv"));
    document.querySelectorAll(".tab-indhold").forEach(t => t.classList.remove("aktiv"));
    this.classList.add("aktiv");
    document.getElementById(this.dataset.tab).classList.add("aktiv");
  });
});

document.getElementById("sim-knap").addEventListener("click", async function () {
  const antalAar = parseInt(document.getElementById("sim-antal-aar").value);

  // Henter case-id fra den sidst oprettede case (sat via case-besked-elementet)
  const caseBesked = document.getElementById("case-besked").textContent;
  const caseId = caseBesked.match(/\d+/)?.[0];
  if (!caseId) {
    alert("Opret først en case");
    return;
  }

  // POST til /api/cases/:id/simulate — backend henter al data fra DB via case-id
  const res = await fetch(`/api/cases/${caseId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ antalAar })
  });
  const resultater = await res.json();

  visSimulering(resultater);
});


// Hvis siden åbnes med ?ejendom_id=X (omdirigeret fra /ejendomme), hentes ejendommen
// og case-formularen vises direkte uden at brugeren skal søge på ny
const fraEjendomId = new URLSearchParams(window.location.search).get("ejendom_id");
if (fraEjendomId) {
  (async function () {
    const res = await fetch("/api/ejendomme/" + fraEjendomId);
    const e = await res.json();
    valgtEjendomId = e.ejendom_id;
    document.getElementById("profil-adresse").textContent      = `${e.vejnavn} ${e.husnummer}, ${e.postnummer} ${e.bynavn}`;
    document.getElementById("profil-ejendomstype").textContent = e.ejendomstype || "Ikke tilgængeligt";
    document.getElementById("profil-byggeaar").textContent     = e.byggeaar || "Ikke tilgængeligt";
    document.getElementById("profil-boligareal").textContent   = e.boligareal_m2 || "Ikke tilgængeligt";
    document.getElementById("profil-vaerelser").textContent    = e.antal_vaerelser || "Ikke tilgængeligt";
    document.getElementById("ejendomsprofil").style.display    = "block";
    document.getElementById("case-formular").style.display     = "block";
    document.getElementById("ejendomsprofil").scrollIntoView({ behavior: "smooth" });
  })();
}