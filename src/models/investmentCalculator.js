// Renovering er en selvstændig klasse (Single Responsibility): den ved hvornår den gælder, det ved InvestmentCalculator ikke
// Dette sikre egentlig bare at det kun kører én ting af gangen
class Renovering {
  constructor(planlagtAar, beloeb) {
    // Validering sker i constructor så et ugyldigt objekt aldrig kan oprettes (fail-fast princip)
    if (beloeb < 0) throw new Error("Renoveringsbeløb må ikke være negativt");
    this.planlagtAar = planlagtAar;
    this.beloeb = beloeb;
  }

  // Isolerer sammenligningslogikken, InvestmentCalculator behøver ikke kende til Renoveringens interne struktur
  erPlanlagtIAar(aar) {
    return this.planlagtAar === aar;
  }
}

// InvestmentCalculator samler alle data og beregninger for en ejendomsinvestering ét sted
class InvestmentCalculator {
  constructor(pris, laanebeloeb, rentesats, loebetidAar, lejeindtaegt, udgifter, afdragsfriPeriodeAar = 0) {
    // Validering i constructor sikrer at et ugyldigt calculator-objekt aldrig eksisterer
    // rentesats forventes som decimalbrøk — 0.04 for 4% — ikke som heltal
    if (rentesats > 1) throw new Error("Rentesats skal være en decimalbrøk, fx 0.04 for 4%");
    if (rentesats < 0) throw new Error("Rentesats må ikke være negativ");
    if (afdragsfriPeriodeAar < 0) throw new Error("Afdragsfri periode må ikke være negativ");
    if (afdragsfriPeriodeAar >= loebetidAar) throw new Error("Afdragsfri periode skal være kortere end løbetiden");
    this.pris = pris;
    this.laanebeloeb = laanebeloeb;
    this.rentesats = rentesats;
    this.loebetidAar = loebetidAar;
    this.lejeindtaegt = lejeindtaegt;
    this.udgifter = udgifter;
    this.afdragsfriPeriodeAar = afdragsfriPeriodeAar;
    // Renoveringer tilføjes efter oprettelse via tilfoejRenovering() — ikke som constructorvparameter
    // fordi antallet er variabelt og ukendt ved oprettelse
    this.renoveringer = [];
    // 2% årlig prisstigning er en ekstern markedsantagelse, taget for Danmarksstatistik.
    this.vaekstrate = 0.02;
  }

  // Samler renoveringer på calculatoren i stedet for at sende dem som parameter til simuler()
  // så alle relevante data er ét sted (Knowledge Expert)
  tilfoejRenovering(renovering) {
    this.renoveringer.push(renovering);
  }

  // Annuitetsformlen: M = P * (r * (1+r)^n) / ((1+r)^n - 1) bare vores standard fremskrivning fra VØS
  // P = lånebeløb, r = månedlig rente, n = antal måneder
  // Med afdragsfri periode amortiseres hele lånebeløbet over de resterende år —
  // i de afdragsfri år betales kun rente, så restgælden er stadig fuld når amortiseringen starter
  beregnMaanedligYdelse() {
    const r = this.rentesats / 12;
    const amortisationsAar = this.loebetidAar - this.afdragsfriPeriodeAar;
    const n = amortisationsAar * 12;
    // Særtilfælde: 0% rente giver division med nul i formlen — lånet fordeles ligeligt i stedet
    if (r === 0) return this.laanebeloeb / n;
    return this.laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  // Sammensatte renter: ejendomsværdien vokser eksponentielt med vaekstrate hvert år
  beregnEjendomsvaerdi(aar) {
    return this.pris * Math.pow(1 + this.vaekstrate, aar);
  }

  // Af den samlede ydelse går renteandelen til banken, resten er afdrag på gælden
  // Renteandelen falder over tid fordi restgælden falder — afdragsandelen stiger tilsvarende
  // aarligYdelse modtages som parameter fordi simuler() beregner den én gang og deler den her og i beregnAarligtCashflow
  beregnNyRestgaeld(restgaeld, aarligYdelse) {
    const aarligRente  = restgaeld * this.rentesats;
    const aarligAfdrag = aarligYdelse - aarligRente;
    // Math.max(0, ...) forhindrer negativ restgæld i lånets sidste år pga. afrundingsfejl
    return Math.max(0, restgaeld - aarligAfdrag);
  }

  // Leverer til Renovering.erPlanlagtIAar() — InvestmentCalculator ved ikke hvornår en renovering gælder
  beregnRenoIAar(aar) {
    return this.renoveringer
      .filter(r => r.erPlanlagtIAar(aar))
      .reduce((sum, r) => sum + r.beloeb, 0);
  }

  // aarligYdelse modtages som parameter fordi simuler() allerede har beregnet den —
  // at kalde beregnMaanedligYdelse() her ville genberegne det samme for hvert af de 30 år
  beregnAarligtCashflow(aarligYdelse, renoIAar = 0) {
    return this.lejeindtaegt - this.udgifter - aarligYdelse - renoIAar;
  }

  simuler(antalAar) {
    const resultater = [];
    let restgaeld = this.laanebeloeb;
    let akkumuleretRente = 0;
    // Annuitetsydelsen gælder kun i de amortiserende år; i afdragsfri år betales kun rente
    const aarligYdelseAmortisation = this.beregnMaanedligYdelse() * 12;

    for (let aar = 0; aar <= antalAar; aar++) {
      const ejendomsvaerdi = this.beregnEjendomsvaerdi(aar);

      // Årets renteomkostning beregnes på primosaldo, så samme formel som i beregnNyRestgaeld
      const aarligRente = aar === 0 ? 0 : restgaeld * this.rentesats;

      // I afdragsfri år (1..afdragsfriPeriodeAar) betales kun rente — restgælden står uændret
      // beregnNyRestgaeld med ydelse=rente giver afdrag=0 og dermed uændret restgæld
      const erAfdragsfri = aar > 0 && aar <= this.afdragsfriPeriodeAar;
      const aarligYdelse = aar === 0 ? 0 : (erAfdragsfri ? aarligRente : aarligYdelseAmortisation);

      // År 0 er udgangspunktet (købstidspunktet) — restgæld nedbringes først fra år 1
      if (aar > 0) {
        restgaeld = this.beregnNyRestgaeld(restgaeld, aarligYdelse);
        akkumuleretRente += aarligRente;
      }

      const renoIAar    = this.beregnRenoIAar(aar);
      // Cashflow er 0 i år 0 — der er ingen driftsperiode endnu, kun købet
      const cashflow    = aar === 0 ? 0 : this.beregnAarligtCashflow(aarligYdelse, renoIAar);
      // Egenkapital = hvad ejendommen er værd minus hvad der stadig skyldes
      const egenkapital = ejendomsvaerdi - restgaeld;

      resultater.push({ aar, ejendomsvaerdi, cashflow, restgaeld, egenkapital, aarligRente, akkumuleretRente });
    }
    return resultater;
  }
}

module.exports = { InvestmentCalculator, Renovering };
