"use strict";

let valgtAdresseId = null;
let valgtLon = null;
let valgtLat = null;
let valgtX25832 = null;
let valgtY25832 = null;

let map = L.map("map").setView([55.6761, 12.5683], 13);
let satelliteLayer = null;
let matrikelLayer = null;
let marker = null;

dawaAutocomplete.dawaAutocomplete(document.getElementById("adresse"), {
  select: async function(selected) {
    document.getElementById("valgtadresse").innerHTML = selected.tekst;

    valgtAdresseId = selected.data.id;
    valgtLon = selected.data.x;
    valgtLat = selected.data.y;

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

  document.getElementById("bbr-resultat").innerHTML = JSON.stringify(data);
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