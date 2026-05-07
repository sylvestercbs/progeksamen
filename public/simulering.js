"use strict";

let simuleringsGraf = null;
let cashflowGraf = null;

function visSimulering(resultater) {
  document.getElementById("sim-resultat").style.display = "block";

  if (simuleringsGraf) simuleringsGraf.destroy();
  simuleringsGraf = new Chart(document.getElementById("sim-graf").getContext("2d"), {
    type: "line",
    data: {
      labels: resultater.map(r => `År ${r.aar}`),
      datasets: [
        { label: "Ejendomsværdi (kr.)", data: resultater.map(r => Math.round(r.ejendomsvaerdi)), borderColor: "steelblue", tension: 0.1 },
        { label: "Gæld (kr.)",          data: resultater.map(r => Math.round(r.restgaeld)),       borderColor: "red",       tension: 0.1 },
        { label: "Egenkapital (kr.)",   data: resultater.map(r => Math.round(r.egenkapital)),     borderColor: "green",     tension: 0.1 }
      ]
    },
    options: {
      plugins: { title: { display: true, text: "Ejendomsværdi, gæld og egenkapital over tid", font: { size: 16 } } },
      scales: {
        y: { title: { display: true, text: "Kr." } }
      }
    }
  });

  if (cashflowGraf) cashflowGraf.destroy();
  cashflowGraf = new Chart(document.getElementById("cashflow-graf").getContext("2d"), {
    type: "bar",
    data: {
      labels: resultater.map(r => `År ${r.aar}`),
      datasets: [
        {
          label: "Årligt cashflow (kr.)",
          data: resultater.map(r => Math.round(r.cashflow)),
          backgroundColor: resultater.map(r => r.cashflow >= 0 ? "#1a5c2e" : "#8b0000"),
          borderWidth: 0
        }
      ]
    },
    options: {
      plugins: { title: { display: true, text: "Cashflow pr. år", font: { size: 16 } } },
      scales: {
        y: { title: { display: true, text: "Kr." }, ticks: { callback: v => v.toLocaleString("da-DK") } }
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
}
