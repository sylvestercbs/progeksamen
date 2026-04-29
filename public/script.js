"use strict";

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

let map = L.map("map").setView([55.6761, 12.5683], 13);
let satelliteLayer = null;
let matrikelLayer = null;
let marker = null;

dawaAutocomplete.dawaAutocomplete(document.getElementById("adresse"), {
  select: async function(selected) {
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

    console.log("Valgt adresse:", selected.tekst);
    console.log("GPS koordinater:", valgtLon, valgtLat);
    console.log("25832 koordinater:", valgtX25832, valgtY25832);
  }
});

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