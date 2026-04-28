"use strict"

let valgtAdresseId = null;

dawaAutocomplete.dawaAutocomplete(document.getElementById("adresse"), {
  select: function(selected) {
    document.getElementById("valgtadresse").innerHTML = selected.tekst;
    valgtAdresseId = selected.data.id;
  }
});

document.getElementById("bbr-knap").addEventListener("click", async function() {
  const res = await fetch("/api/bbr?adresseId=" + valgtAdresseId);
  const data = await res.json();
  document.getElementById("bbr-resultat").innerHTML = JSON.stringify(data);
});