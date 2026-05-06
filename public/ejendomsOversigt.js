"use strict";

function skiftRcTab(delta) {
  const knapper = [...document.querySelectorAll(".rc-tab-knap")];
  const aktivIndex = knapper.findIndex(k => k.classList.contains("aktiv"));
  const naesteIndex = aktivIndex + delta;
  if (naesteIndex >= 0 && naesteIndex < knapper.length) {
    knapper[naesteIndex].click();
    document.getElementById("rediger-case-formular").scrollIntoView({ behavior: "smooth" });
  }
}

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
          <button class="tabel-knap" onclick="redigerCase(${c.case_id})">Rediger</button>
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

async function sammenlignCases() {
  const data = [];
  for (const c of valgteCases) {
    const laanRes    = await fetch(`/api/laan/${c.id}`);
    const caseResRes = await fetch(`/api/cases/${c.id}`);
    const laan       = await laanRes.json();
    const caseRes    = await caseResRes.json();
    const l = laan[0] || {};
    // maanedlig_ydelse beregnes af backend via InvestmentCalculator — undgår duplikering af annuitetsformlen
    data.push({
      case:    c,
      laan:    l,
      caseRes: caseRes,
      ydelse:  l.maanedlig_ydelse != null ? l.maanedlig_ydelse : null,
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

// State til redigering af eksisterende case
const rcRenoveringer     = [];
const rcDriftsposter     = [];
const rcUdlejningsposter = [];
const slettedeRenoveringer = [];
const slettedeOmkostninger = [];
const slettedeUdlejninger  = [];

// Tab-skift scoped til #rediger-case-formular
document.querySelectorAll(".rc-tab-knap").forEach(knap => {
  knap.addEventListener("click", function () {
    document.querySelectorAll(".rc-tab-knap").forEach(k => k.classList.remove("aktiv"));
    document.querySelectorAll(".rc-tab-indhold").forEach(t => t.classList.remove("aktiv"));
    this.classList.add("aktiv");
    document.getElementById(this.dataset.tab).classList.add("aktiv");
  });
});

async function redigerCase(caseId) {
  try {
    rcRenoveringer.length      = 0;
    rcDriftsposter.length      = 0;
    rcUdlejningsposter.length  = 0;
    slettedeRenoveringer.length = 0;
    slettedeOmkostninger.length = 0;
    slettedeUdlejninger.length  = 0;

    const [caseData, laanRes, renoRes, driftRes, udlejRes] = await Promise.all([
      fetch(`/api/cases/${caseId}`).then(r => r.json()),
      fetch(`/api/laan/${caseId}`).then(r => r.json()),
      fetch(`/api/renoveringer/${caseId}`).then(r => r.json()),
      fetch(`/api/driftsomkostninger/${caseId}`).then(r => r.json()),
      fetch(`/api/udlejning/${caseId}`).then(r => r.json()),
    ]);

    aktivCaseId = caseId;
    const laan = laanRes[0] || {};

    document.getElementById("rc-case-id").value            = caseId;
    document.getElementById("rc-laan-id").value             = laan.laan_id || "";
    document.getElementById("rc-navn").value                = caseData.navn || "";
    document.getElementById("rc-beskrivelse").value         = caseData.beskrivelse || "";
    document.getElementById("rc-ejendomspris").value        = caseData.ejendomspris || "";
    document.getElementById("rc-koebs-omkostninger").value  = caseData.koebs_omkostninger || "";
    document.getElementById("rc-laan-beloeb").value         = laan.laanebeloeb || "";
    document.getElementById("rc-laan-rente").value          = laan.rentesats || "";
    document.getElementById("rc-laan-loebetid").value       = laan.loebetid_aar || "";
    document.getElementById("rc-laan-afdragsfri").value     = laan.afdragsfri_periode_aar || 0;
    document.getElementById("rc-laan-type").value           = laan.laantype || "Realkredit";

    function bygListe(listeId, poster, labelFn, idKey, sletArr) {
      const ul = document.getElementById(listeId);
      ul.innerHTML = "";
      poster.forEach(post => {
        const li = document.createElement("li");
        li.textContent = labelFn(post) + " ";
        const sletKnap = document.createElement("button");
        sletKnap.textContent = "Slet";
        sletKnap.className = "tabel-knap slet";
        sletKnap.onclick = () => { sletArr.push(post[idKey]); li.remove(); };
        li.appendChild(sletKnap);
        ul.appendChild(li);
      });
    }

    bygListe("rc-renovering-liste", renoRes,
      r => `${r.beskrivelse}: ${Number(r.beloeb).toLocaleString("da-DK")} kr. (år ${r.planlagt_aar})`,
      "renovering_id", slettedeRenoveringer
    );
    bygListe("rc-drift-liste", driftRes,
      d => `${d.beskrivelse}: ${Number(d.beloeb).toLocaleString("da-DK")} kr. (${d.er_maanedlig ? "månedlig" : "årlig"})`,
      "omkostning_id", slettedeOmkostninger
    );
    bygListe("rc-udlejning-liste", udlejRes,
      u => `${u.posttype}: ${Number(u.beloeb).toLocaleString("da-DK")} kr. (${u.er_maanedlig ? "månedlig" : "årlig"})`,
      "udlejning_id", slettedeUdlejninger
    );

    ["rc-renovering-beskrivelse","rc-renovering-beloeb","rc-renovering-aar",
     "rc-drift-beskrivelse","rc-drift-beloeb","rc-udlejning-beloeb"].forEach(id => {
      document.getElementById(id).value = "";
    });

    document.querySelectorAll(".rc-tab-knap").forEach(k => k.classList.remove("aktiv"));
    document.querySelectorAll(".rc-tab-indhold").forEach(t => t.classList.remove("aktiv"));
    document.querySelector(".rc-tab-knap[data-tab='rc-tab-koeb']").classList.add("aktiv");
    document.getElementById("rc-tab-koeb").classList.add("aktiv");

    const formular = document.getElementById("rediger-case-formular");
    formular.style.display = "block";
    formular.scrollIntoView();
  } catch (err) {
    alert("Kunne ikke hente casedata: " + err.message);
  }
}

document.getElementById("rc-renovering-tilfoej").addEventListener("click", function () {
  const beskrivelse = document.getElementById("rc-renovering-beskrivelse").value.trim();
  const beloeb      = document.getElementById("rc-renovering-beloeb").value;
  const aar         = document.getElementById("rc-renovering-aar").value;
  if (!beskrivelse || !beloeb || !aar) { alert("Udfyld alle renoveringsfelter"); return; }
  rcRenoveringer.push({ beskrivelse, beloeb: parseFloat(beloeb), planlagt_aar: parseInt(aar) });
  const li = document.createElement("li");
  li.textContent = `${beskrivelse}: ${Number(beloeb).toLocaleString("da-DK")} kr. (år ${aar}) (ny)`;
  document.getElementById("rc-renovering-liste").appendChild(li);
  document.getElementById("rc-renovering-beskrivelse").value = "";
  document.getElementById("rc-renovering-beloeb").value = "";
  document.getElementById("rc-renovering-aar").value = "";
});

document.getElementById("rc-drift-tilfoej").addEventListener("click", function () {
  const beskrivelse  = document.getElementById("rc-drift-beskrivelse").value.trim();
  const beloeb       = document.getElementById("rc-drift-beloeb").value;
  const er_maanedlig = document.getElementById("rc-drift-frekvens").value;
  if (!beskrivelse || !beloeb) { alert("Udfyld beskrivelse og beløb"); return; }
  rcDriftsposter.push({ beskrivelse, beloeb: parseFloat(beloeb), er_maanedlig: parseInt(er_maanedlig) });
  const li = document.createElement("li");
  li.textContent = `${beskrivelse}: ${Number(beloeb).toLocaleString("da-DK")} kr. (${er_maanedlig === "1" ? "månedlig" : "årlig"}) (ny)`;
  document.getElementById("rc-drift-liste").appendChild(li);
  document.getElementById("rc-drift-beskrivelse").value = "";
  document.getElementById("rc-drift-beloeb").value = "";
});

document.getElementById("rc-udlejning-tilfoej").addEventListener("click", function () {
  const posttype     = document.getElementById("rc-udlejning-type").value;
  const beloeb       = document.getElementById("rc-udlejning-beloeb").value;
  const er_maanedlig = document.getElementById("rc-udlejning-frekvens").value;
  if (!beloeb) { alert("Udfyld beløb"); return; }
  rcUdlejningsposter.push({ posttype, beloeb: parseFloat(beloeb), er_maanedlig: parseInt(er_maanedlig) });
  const li = document.createElement("li");
  li.textContent = `${posttype}: ${Number(beloeb).toLocaleString("da-DK")} kr. (${er_maanedlig === "1" ? "månedlig" : "årlig"}) (ny)`;
  document.getElementById("rc-udlejning-liste").appendChild(li);
  document.getElementById("rc-udlejning-beloeb").value = "";
});

document.getElementById("rc-annuller-knap").addEventListener("click", function () {
  document.getElementById("rediger-case-formular").style.display = "none";
});

document.getElementById("rc-gem-knap").addEventListener("click", async function () {
  const caseId = document.getElementById("rc-case-id").value;
  const laanId = document.getElementById("rc-laan-id").value;
  try {
    const caseRes = await fetch(`/api/cases/${caseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        navn:               document.getElementById("rc-navn").value,
        beskrivelse:        document.getElementById("rc-beskrivelse").value,
        ejendomspris:       parseFloat(document.getElementById("rc-ejendomspris").value),
        koebs_omkostninger: parseFloat(document.getElementById("rc-koebs-omkostninger").value) || 0,
      }),
    });
    if (!caseRes.ok) throw new Error("Kunne ikke gemme casedata");

    const laanPost = await fetch("/api/laan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id:               parseInt(caseId),
        laantype:              document.getElementById("rc-laan-type").value,
        laanebeloeb:           parseFloat(document.getElementById("rc-laan-beloeb").value),
        rentesats:             parseFloat(document.getElementById("rc-laan-rente").value),
        loebetid_aar:          parseInt(document.getElementById("rc-laan-loebetid").value),
        afdragsfri_periode_aar: parseInt(document.getElementById("rc-laan-afdragsfri").value) || 0,
      }),
    });
    if (!laanPost.ok) throw new Error("Kunne ikke gemme lånedata");
    if (laanId) await fetch(`/api/laan/${laanId}`, { method: "DELETE" });

    for (const id of slettedeRenoveringer) await fetch(`/api/renoveringer/${id}`, { method: "DELETE" });
    for (const id of slettedeOmkostninger) await fetch(`/api/driftsomkostninger/${id}`, { method: "DELETE" });
    for (const id of slettedeUdlejninger)  await fetch(`/api/udlejning/${id}`, { method: "DELETE" });

    for (const r of rcRenoveringer) {
      await fetch("/api/renoveringer", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: parseInt(caseId), ...r }) });
    }
    for (const d of rcDriftsposter) {
      await fetch("/api/driftsomkostninger", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: parseInt(caseId), ...d }) });
    }
    for (const u of rcUdlejningsposter) {
      await fetch("/api/udlejning", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: parseInt(caseId), ...u }) });
    }

    document.getElementById("rediger-case-formular").style.display = "none";
    await visCases(aktivEjendomId, document.getElementById("cases-overskrift").textContent.replace("Cases for ", ""));
  } catch (err) {
    alert("Gem fejlede: " + err.message);
  }
});

loadEjendomme();
