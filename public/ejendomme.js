"use strict";

async function loadEjendomme() {
  const res = await fetch("/api/ejendomme");
  const ejendomme = await res.json();
  const liste = document.getElementById("ejendomme-liste");

  if (!ejendomme.length) {
    liste.innerHTML = "<p>Ingen ejendomsprofiler endnu.</p>";
    return;
  }

  let html = `<table class="data-tabel">
    <tr><th>Adresse</th><th>Oprettet</th><th>Sidst hentet</th><th>Cases</th><th>Handlinger</th></tr>`;
  ejendomme.forEach(e => {
    const adresse  = `${e.vejnavn} ${e.husnummer}, ${e.postnummer} ${e.bynavn}`;
    const oprettet = new Date(e.oprettet).toLocaleDateString("da-DK");
    const hentet   = e.sidst_hentet ? new Date(e.sidst_hentet).toLocaleDateString("da-DK") : "-";
    html += `<tr>
      <td>${adresse}</td>
      <td>${oprettet}</td>
      <td>${hentet}</td>
      <td>${e.antal_cases}</td>
      <td class="knap-celle">
        <button class="tabel-knap" onclick="visCases(${e.ejendom_id}, '${adresse}')">Se cases</button>
        <button class="tabel-knap" onclick="redigerEjendom(${e.ejendom_id})">Rediger</button>
        <button class="tabel-knap slet" onclick="sletEjendom(${e.ejendom_id})">Slet</button>
      </td>
    </tr>`;
  });
  html += "</table>";
  liste.innerHTML = html;
}

async function sletEjendom(id) {
  if (!confirm("Er du sikker? Dette sletter ejendommen og alle tilknyttede cases.")) return;
  const res = await fetch(`/api/ejendomme/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert("Sletning fejlede: " + data.error);
    return;
  }
  loadEjendomme();
}

async function redigerEjendom(id) {
  const res = await fetch(`/api/ejendomme/${id}`);
  const e = await res.json();
  document.getElementById("rediger-id").value           = e.ejendom_id;
  document.getElementById("rediger-vejnavn").value      = e.vejnavn || "";
  document.getElementById("rediger-husnummer").value    = e.husnummer || "";
  document.getElementById("rediger-postnummer").value   = e.postnummer || "";
  document.getElementById("rediger-bynavn").value       = e.bynavn || "";
  document.getElementById("rediger-ejendomstype").value = e.ejendomstype || "";
  document.getElementById("rediger-byggeaar").value     = e.byggeaar || "";
  document.getElementById("rediger-boligareal").value   = e.boligareal_m2 || "";
  document.getElementById("rediger-vaerelser").value    = e.antal_vaerelser || "";
  document.getElementById("rediger-form").style.display = "block";
  document.getElementById("rediger-form").scrollIntoView();
}

document.getElementById("gem-rediger-knap").addEventListener("click", async function () {
  const id = document.getElementById("rediger-id").value;
  await fetch(`/api/ejendomme/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vejnavn:         document.getElementById("rediger-vejnavn").value,
      husnummer:       document.getElementById("rediger-husnummer").value,
      postnummer:      document.getElementById("rediger-postnummer").value,
      bynavn:          document.getElementById("rediger-bynavn").value,
      ejendomstype:    document.getElementById("rediger-ejendomstype").value,
      byggeaar:        parseInt(document.getElementById("rediger-byggeaar").value),
      boligareal_m2:   parseFloat(document.getElementById("rediger-boligareal").value),
      antal_vaerelser: parseInt(document.getElementById("rediger-vaerelser").value),
    })
  });
  document.getElementById("rediger-form").style.display = "none";
  loadEjendomme();
});

document.getElementById("annuller-rediger-knap").addEventListener("click", function () {
  document.getElementById("rediger-form").style.display = "none";
});

async function visCases(ejendomId, adresse) {
  aktivEjendomId = ejendomId;
  const res = await fetch(`/api/cases?ejendom_id=${ejendomId}`);
  const cases = await res.json();
  const sektion = document.getElementById("cases-sektion");

  document.getElementById("cases-overskrift").textContent = `Cases for ${adresse}`;

  if (!cases.length) {
    document.getElementById("cases-liste").innerHTML = "<p>Ingen cases oprettet endnu.</p>";
  } else {
    let html = `<table class="data-tabel">
      <tr><th>Navn</th><th>Ejendomspris</th><th>Oprettet</th><th></th></tr>`;
    cases.forEach(c => {
      const pris = c.ejendomspris ? Number(c.ejendomspris).toLocaleString("da-DK") + " kr." : "-";
      const oprettet = new Date(c.oprettet).toLocaleDateString("da-DK");
      html += `<tr>
        <td>${c.navn}</td>
        <td>${pris}</td>
        <td>${oprettet}</td>
        <td><button class="tabel-knap" onclick="klargørSimulering(${c.case_id}, '${c.navn}')">Simuler</button></td>
      </tr>`;
    });
    html += "</table>";
    document.getElementById("cases-liste").innerHTML = html;
  }

  sektion.style.display = "block";
  sektion.scrollIntoView();
}

let aktivEjendomId = null;
let aktivCaseId = null;
let simuleringsGraf = null;

function gaaTilNyCase() {
  window.location.href = "/?ejendom_id=" + aktivEjendomId;
}

async function klargørSimulering(caseId, casenavn) {
  aktivCaseId = caseId;
  document.getElementById("sim-casenavn").textContent = casenavn;

  const laanRes = await fetch(`/api/laan/${caseId}`);
  const laan = await laanRes.json();
  if (laan.length) {
    document.getElementById("sim-laanebeloeb").value = laan[0].laanebeloeb;
    document.getElementById("sim-rentesats").value   = laan[0].rentesats;
    document.getElementById("sim-loebetid").value    = laan[0].loebetid_aar;
  }

  document.getElementById("sim-sektion").style.display = "block";
  document.getElementById("sim-resultat").style.display = "none";
  document.getElementById("sim-sektion").scrollIntoView();
}

document.getElementById("sim-knap").addEventListener("click", async function () {
  const laanebeloeb  = parseFloat(document.getElementById("sim-laanebeloeb").value);
  const rentesats    = parseFloat(document.getElementById("sim-rentesats").value);
  const loebetid_aar = parseInt(document.getElementById("sim-loebetid").value);
  const lejeindtaegt = parseFloat(document.getElementById("sim-lejeindtaegt").value) || 0;
  const udgifter     = parseFloat(document.getElementById("sim-udgifter").value) || 0;
  const antalAar     = parseInt(document.getElementById("sim-antal-aar").value);

  const res = await fetch(`/api/cases/${aktivCaseId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pris: laanebeloeb, laanebeloeb, rentesats, loebetid_aar, lejeindtaegt, udgifter, antalAar })
  });
  const resultater = await res.json();

  document.getElementById("sim-resultat").style.display = "block";

  if (simuleringsGraf) simuleringsGraf.destroy();
  simuleringsGraf = new Chart(document.getElementById("sim-graf").getContext("2d"), {
    type: "line",
    data: {
      labels: resultater.map(r => `År ${r.aar}`),
      datasets: [
        { label: "Ejendomsværdi (kr.)", data: resultater.map(r => Math.round(r.ejendomsvaerdi)), borderColor: "steelblue", tension: 0.1, yAxisID: "y" },
        { label: "Gæld (kr.)",          data: resultater.map(r => Math.round(r.restgaeld)),       borderColor: "red",       tension: 0.1, yAxisID: "y" },
        { label: "Egenkapital (kr.)",   data: resultater.map(r => Math.round(r.egenkapital)),     borderColor: "green",     tension: 0.1, yAxisID: "y" },
        { label: "Cashflow (kr.)",      data: resultater.map(r => Math.round(r.cashflow)),        borderColor: "orange",    tension: 0.1, yAxisID: "y1" }
      ]
    },
    options: {
      scales: {
        y:  { position: "left",  title: { display: true, text: "Kr." } },
        y1: { position: "right", title: { display: true, text: "Cashflow (kr.)" }, grid: { drawOnChartArea: false } }
      }
    }
  });

  let html = "<table class='data-tabel'><tr><th>År</th><th>Ejendomsværdi</th><th>Gæld</th><th>Egenkapital</th><th>Cashflow</th></tr>";
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
  document.getElementById("sim-tabel").innerHTML = html;
  document.getElementById("sim-resultat").scrollIntoView();
});

loadEjendomme();
