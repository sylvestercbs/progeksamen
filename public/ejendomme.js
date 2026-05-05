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
      <tr><th>Vælg</th><th>Navn</th><th>Ejendomspris</th><th>Oprettet</th><th></th></tr>`;
    cases.forEach(c => {
      const pris = c.ejendomspris ? Number(c.ejendomspris).toLocaleString("da-DK") + " kr." : "-";
      const oprettet = new Date(c.oprettet).toLocaleDateString("da-DK");
      const sikkertNavn = c.navn.replace(/'/g, "\\'");
      const erValgt = valgteCases.some(vc => vc.id === c.case_id) ? "checked" : "";
      html += `<tr>
        <td><input type="checkbox" ${erValgt} onchange="toggleCaseValg(${c.case_id}, '${sikkertNavn}')"></td>
        <td>${c.navn}</td>
        <td>${pris}</td>
        <td>${oprettet}</td>
        <td>
          <button class="tabel-knap" onclick="klargørSimulering(${c.case_id}, '${sikkertNavn}')">Simuler</button>
          <button class="tabel-knap" onclick="duplikerCase(${c.case_id}, '${sikkertNavn}')">Dupliker</button>
        </td>
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

// Holder styr på hvilke cases der er valgt til sammenligning
const valgteCases = [];

function toggleCaseValg(caseId, casenavn) {
  const index = valgteCases.findIndex(c => c.id === caseId);
  if (index === -1) {
    valgteCases.push({ id: caseId, navn: casenavn });
  } else {
    valgteCases.splice(index, 1);
  }
  const knap = document.getElementById("sammenlign-knap");
  if (valgteCases.length >= 2) {
    knap.style.display = "inline-block";
    knap.textContent = `Sammenlign (${valgteCases.length})`;
  } else {
    knap.style.display = "none";
  }
}

function beregnMaanedligYdelse(beloeb, rentesats, loebetid_aar) {
  if (beloeb == null || rentesats == null || loebetid_aar == null) return null;
  const r = rentesats / 12;
  const n = loebetid_aar * 12;
  if (r === 0) return beloeb / n;
  return beloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

async function sammenlignCases() {
  const data = [];
  for (const c of valgteCases) {
    const laanRes    = await fetch(`/api/laan/${c.id}`);
    const caseResRes = await fetch(`/api/cases/${c.id}`);
    const laan       = await laanRes.json();
    const caseRes    = await caseResRes.json();
    const l = laan[0] || {};
    data.push({
      case:    c,
      laan:    l,
      caseRes: caseRes,
      ydelse:  beregnMaanedligYdelse(l.laanebeloeb, l.rentesats, l.loebetid_aar),
    });
  }

  const rows = [
    ["Casenavn",        ...data.map(d => d.case.navn)],
    ["Ejendomspris",    ...data.map(d => fmt(d.caseRes.ejendomspris))],
    ["Lånebeløb",       ...data.map(d => fmt(d.laan.laanebeloeb))],
    ["Rentesats",       ...data.map(d => d.laan.rentesats != null ? (d.laan.rentesats * 100).toFixed(2) + " %" : "-")],
    ["Løbetid",         ...data.map(d => d.laan.loebetid_aar != null ? d.laan.loebetid_aar + " år" : "-")],
    ["Månedlig ydelse", ...data.map(d => d.ydelse != null ? fmt(Math.round(d.ydelse)) : "-")],
  ];

  const tabel = document.createElement("table");
  tabel.className = "data-tabel";

  const headerRaekke = document.createElement("tr");
  const feltHeader = document.createElement("th");
  feltHeader.textContent = "Felt";
  headerRaekke.appendChild(feltHeader);
  data.forEach(function(d) {
    const th = document.createElement("th");
    th.textContent = d.case.navn;
    headerRaekke.appendChild(th);
  });
  tabel.appendChild(headerRaekke);

  rows.forEach(function(row) {
    const tr = document.createElement("tr");
    const tdFelt = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = row[0];
    tdFelt.appendChild(strong);
    tr.appendChild(tdFelt);
    for (let i = 1; i < row.length; i++) {
      const td = document.createElement("td");
      td.textContent = row[i] || "-";
      tr.appendChild(td);
    }
    tabel.appendChild(tr);
  });

  const indhold = document.getElementById("sammenlign-indhold");
  indhold.innerHTML = "";
  indhold.appendChild(tabel);

  const sek = document.getElementById("sammenlign-sektion");
  sek.style.display = "block";
  sek.scrollIntoView();
}

function fmt(tal) {
  return tal != null ? Number(tal).toLocaleString("da-DK") + " kr." : "-";
}

function gaaTilNyCase() {
  window.location.href = "/?ejendom_id=" + aktivEjendomId;
}

let aktivLaanId = null;

async function duplikerCase(caseId, casenavn) {
  if (!confirm(`Dupliker "${casenavn}"?`)) return;
  const res = await fetch(`/api/cases/${caseId}/duplicate`, { method: "POST" });
  if (!res.ok) { alert("Duplikering fejlede"); return; }
  const { case_id: nyCaseId } = await res.json();
  await visCases(aktivEjendomId, document.getElementById("cases-overskrift").textContent.replace("Cases for ", ""));
  klargørSimulering(nyCaseId, casenavn + " (kopi)");
}

function toggleRedigerSim() {
  const felter = ["sim-ejendomspris", "sim-laanebeloeb", "sim-rentesats", "sim-loebetid"];
  const redigerer = document.getElementById("rediger-sim-knap").textContent === "Rediger";
  felter.forEach(id => document.getElementById(id).toggleAttribute("readonly"));
  document.getElementById("rediger-sim-knap").textContent = redigerer ? "Annuller" : "Rediger";
  document.getElementById("gem-sim-knap").style.display   = redigerer ? "inline" : "none";
}

async function gemCaseRettelser() {
  try {
    const caseRes = await fetch(`/api/cases/${aktivCaseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ejendomspris: parseFloat(document.getElementById("sim-ejendomspris").value),
      }),
    });
    if (!caseRes.ok) throw new Error("Kunne ikke gemme casedata");

    if (aktivLaanId) {
      const laanRes = await fetch(`/api/laan/${aktivLaanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          laanebeloeb:  parseFloat(document.getElementById("sim-laanebeloeb").value),
          rentesats:    parseFloat(document.getElementById("sim-rentesats").value),
          loebetid_aar: parseInt(document.getElementById("sim-loebetid").value),
        }),
      });
      if (!laanRes.ok) throw new Error("Kunne ikke gemme lånedata");
    }

    toggleRedigerSim();
  } catch (err) {
    alert("Gem fejlede: " + err.message);
  }
}

async function klargørSimulering(caseId, casenavn) {
  aktivCaseId = caseId;
  document.getElementById("sim-casenavn").textContent = casenavn;

  const [laanRes, caseRes, driftRes, udlejRes] = await Promise.all([
    fetch(`/api/laan/${caseId}`),
    fetch(`/api/cases/${caseId}`),
    fetch(`/api/driftsomkostninger/${caseId}`),
    fetch(`/api/udlejning/${caseId}`),
  ]);

  const laan    = await laanRes.json();
  const invCase = await caseRes.json();
  const drift   = await driftRes.json();
  const udlejn  = await udlejRes.json();

  if (laan.length) {
    aktivLaanId = laan[0].laan_id;
    document.getElementById("sim-laanebeloeb").value = laan[0].laanebeloeb;
    document.getElementById("sim-rentesats").value   = laan[0].rentesats;
    document.getElementById("sim-loebetid").value    = laan[0].loebetid_aar;
  }

  if (invCase) {
    document.getElementById("sim-ejendomspris").value = invCase.ejendomspris;
  }

  const aarligUdlejn = udlejn.reduce((sum, r) => sum + Number(r.aarligt_beloeb), 0);
  const aarligDrift  = drift.reduce((sum, r) => sum + Number(r.aarligt_beloeb), 0);
  document.getElementById("sim-lejeindtaegt").value = aarligUdlejn;
  document.getElementById("sim-udgifter").value     = aarligDrift;

  document.getElementById("sim-sektion").style.display = "block";
  document.getElementById("sim-resultat").style.display = "none";
  document.getElementById("sim-sektion").scrollIntoView();
}

document.getElementById("sim-knap").addEventListener("click", async function () {
  const antalAar = parseInt(document.getElementById("sim-antal-aar").value);

  // POST til /api/cases/:id/simulate — backend henter al data fra DB via case-id
  const res = await fetch(`/api/cases/${aktivCaseId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ antalAar })
  });
  const resultater = await res.json();

  visSimulering(resultater);
});

loadEjendomme();
