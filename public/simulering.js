"use strict";

let simuleringsGraf = null;

function visSimulering(resultater) {
  document.getElementById("sim-resultat").style.display = "block";

  if (simuleringsGraf) simuleringsGraf.destroy();
  simuleringsGraf = new Chart(document.getElementById("sim-graf").getContext("2d"), {
    type: "line",
    data: {
      labels: resultater.map(r => `År ${r.aar}`),
      datasets: [
        { label: "Ejendomsværdi (kr.)", data: resultater.map(r => Math.round(r.ejendomsvaerdi)), borderColor: "steelblue", tension: 0.1, yAxisID: "y"  },
        { label: "Gæld (kr.)",          data: resultater.map(r => Math.round(r.restgaeld)),       borderColor: "red",       tension: 0.1, yAxisID: "y"  },
        { label: "Egenkapital (kr.)",   data: resultater.map(r => Math.round(r.egenkapital)),     borderColor: "green",     tension: 0.1, yAxisID: "y"  },
        { label: "Årligt cashflow (kr.)",data: resultater.map(r => Math.round(r.cashflow)),       borderColor: "orange",    tension: 0.1, yAxisID: "y1" }
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
}
