// Renovering er en selvstændig klasse: den ved hvornår den gælder, det ved InvestmentCalculator ikke
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

// Laan håndterer sin egen amortisering — annuitetsformel, afdragsfri-periode og restgæld pr. år.
// Det gør at InvestmentCalculator bare kan iterere over en liste af lån uden at kende renteformler,
// og en case kan have flere lån (fx realkreditlån + banklån) der amortiseres uafhængigt af hinanden.
class Laan {
  constructor(laanebeloeb, rentesats, loebetidAar, afdragsfriPeriodeAar = 0) {
    if (laanebeloeb < 0) throw new Error("Lånebeløb må ikke være negativt");
    // rentesats forventes som decimalbrøk — 0.04 for 4% — ikke som heltal
    if (rentesats > 1) throw new Error("Rentesats skal være en decimalbrøk, fx 0.04 for 4%");
    if (rentesats < 0) throw new Error("Rentesats må ikke være negativ");
    if (loebetidAar <= 0) throw new Error("Løbetid skal være positiv");
    if (afdragsfriPeriodeAar < 0) throw new Error("Afdragsfri periode må ikke være negativ");
    if (afdragsfriPeriodeAar >= loebetidAar) throw new Error("Afdragsfri periode skal være kortere end løbetiden");
    this.laanebeloeb = laanebeloeb;
    this.rentesats = rentesats;
    this.loebetidAar = loebetidAar;
    this.afdragsfriPeriodeAar = afdragsfriPeriodeAar;
  }

  // Annuitetsformlen: M = P * (r * (1+r)^n) / ((1+r)^n - 1) — standard fremskrivning fra VØS
  // Statisk metode så formlen kan kaldes uden at instantiere et Laan-objekt
  // (fx fra ruter hvor data allerede er valideret af DB-laget)
  static beregnMaanedligYdelse(laanebeloeb, rentesats, loebetidAar, afdragsfriPeriodeAar = 0) {
    const r = rentesats / 12;
    const amortisationsAar = loebetidAar - afdragsfriPeriodeAar;
    const n = amortisationsAar * 12;
    // Særtilfælde: 0% rente giver division med nul i formlen — lånet fordeles ligeligt i stedet
    if (r === 0) return laanebeloeb / n;
    return laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  // Instans-metode delegerer til den statiske — én formel-implementation, to kald-måder
  beregnMaanedligYdelse() {
    return Laan.beregnMaanedligYdelse(this.laanebeloeb, this.rentesats, this.loebetidAar, this.afdragsfriPeriodeAar);
  }

  // I afdragsfri år betales kun rente; ellers den fulde annuitetsydelse
  beregnAarligYdelseIAar(aar, restgaeld) {
    if (aar <= 0) return 0;
    const erAfdragsfri = aar <= this.afdragsfriPeriodeAar;
    if (erAfdragsfri) return restgaeld * this.rentesats;
    return this.beregnMaanedligYdelse() * 12;
  }

  beregnAarligRente(restgaeld) {
    return restgaeld * this.rentesats;
  }

  // Af den samlede ydelse går renteandelen til banken, resten er afdrag på gælden
  // Math.max(0, ...) forhindrer negativ restgæld i lånets sidste år pga. afrundingsfejl
  beregnNyRestgaeld(restgaeld, aarligYdelse) {
    const aarligRente = restgaeld * this.rentesats;
    const aarligAfdrag = aarligYdelse - aarligRente;
    return Math.max(0, restgaeld - aarligAfdrag);
  }
}

// InvestmentCalculator samler alle data og beregninger for en ejendomsinvestering ét sted
class InvestmentCalculator {
  constructor(pris, laan, lejeindtaegt, udgifter, koebsOmkostninger = 0) {
    // Validering i constructor sikrer at et ugyldigt calculator-objekt aldrig eksisterer
    if (!Array.isArray(laan)) throw new Error("laan skal være en liste af Laan-objekter");
    if (laan.length === 0) throw new Error("Mindst ét lån er påkrævet");
    if (koebsOmkostninger < 0) throw new Error("Købsomkostninger må ikke være negative");
    this.pris = pris;
    this.laan = laan;
    this.lejeindtaegt = lejeindtaegt;
    this.udgifter = udgifter;
    this.koebsOmkostninger = koebsOmkostninger;
    // Renoveringer tilføjes efter oprettelse via tilfoejRenovering() — ikke som constructorparameter
    // fordi antallet er variabelt og ukendt ved oprettelse
    this.renoveringer = [];
    // 2% årlig prisstigning er en ekstern markedsantagelse, taget for Danmarksstatistik.
    this.vaekstrate = 0.02;
  }

  tilfoejRenovering(renovering) {
    this.renoveringer.push(renovering);
  }

  // Samlet månedlig ydelse på tværs af alle lån (delegerer til hvert Laan-objekt)
  beregnMaanedligYdelse() {
    return this.laan.reduce((sum, l) => sum + l.beregnMaanedligYdelse(), 0);
  }

  // Sammensatte renter: ejendomsværdien vokser eksponentielt med vaekstrate hvert år
  beregnEjendomsvaerdi(aar) {
    return this.pris * Math.pow(1 + this.vaekstrate, aar);
  }

  // Leverer til Renovering.erPlanlagtIAar() — InvestmentCalculator ved ikke hvornår en renovering gælder
  beregnRenoIAar(aar) {
    return this.renoveringer
      .filter(r => r.erPlanlagtIAar(aar))
      .reduce((sum, r) => sum + r.beloeb, 0);
  }

  beregnAarligtCashflow(aarligYdelse, renoIAar = 0) {
    return this.lejeindtaegt - this.udgifter - aarligYdelse - renoIAar;
  }

  simuler(antalAar) {
    const resultater = [];
    // Parallelt array — én restgæld pr. lån, så hvert lån amortiseres uafhængigt
    const restgaelder = this.laan.map(l => l.laanebeloeb);
    let akkumuleretRente = 0;

    for (let aar = 0; aar <= antalAar; aar++) {
      const ejendomsvaerdi = this.beregnEjendomsvaerdi(aar);

      let aarligRente = 0;
      let aarligYdelse = 0;

      // År 0 er udgangspunktet (købstidspunktet) — restgæld nedbringes først fra år 1
      if (aar > 0) {
        // Hvert lån håndterer sin egen ydelse, rente og restgæld — også afdragsfri-perioden
        for (let i = 0; i < this.laan.length; i++) {
          const l = this.laan[i];
          const ydelse = l.beregnAarligYdelseIAar(aar, restgaelder[i]);
          aarligYdelse += ydelse;
          aarligRente  += l.beregnAarligRente(restgaelder[i]);
          restgaelder[i] = l.beregnNyRestgaeld(restgaelder[i], ydelse);
        }
        akkumuleretRente += aarligRente;
      }

      const totalRestgaeld = restgaelder.reduce((sum, r) => sum + r, 0);
      const renoIAar       = this.beregnRenoIAar(aar);
      // Cashflow er 0 i år 0 — der er ingen driftsperiode endnu, kun købet
      const cashflow       = aar === 0 ? 0 : this.beregnAarligtCashflow(aarligYdelse, renoIAar);
      // Egenkapital = hvad ejendommen er værd minus hvad der stadig skyldes
      // Købsomkostninger (advokat, tinglysning mv.) er en sunk cost der permanent reducerer egenkapitalen,
      // fordi de er betalt kontant ved købet og aldrig kan trækkes ud igen
      const egenkapital    = ejendomsvaerdi - totalRestgaeld - this.koebsOmkostninger;

      resultater.push({ aar, ejendomsvaerdi, cashflow, restgaeld: totalRestgaeld, egenkapital, aarligRente, akkumuleretRente });
    }
    return resultater;
  }
}

module.exports = { InvestmentCalculator, Renovering, Laan };
