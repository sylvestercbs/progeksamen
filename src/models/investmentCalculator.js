class InvestmentCalculator {
  constructor(pris, laanebeloeb, rentesats, loebetid_aar) {
    this.pris = pris;
    this.laanebeloeb = laanebeloeb;
    this.rentesats = rentesats;
    this.loebetid_aar = loebetid_aar;
  }

  // Annuitetsformlen beregner fast månedlig ydelse (ekstern matematisk viden)
  beregnMaanedligYdelse() {
    if (this.rentesats < 0) throw new Error("Rentesats må ikke være negativ");
    const r = this.rentesats / 12;
    const n = this.loebetid_aar * 12;
    return this.laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  // Årligt cashflow er lejeindtægt minus udgifter minus årlig låneydelse
  beregnAarligtCashflow(lejeindtaegt, udgifter) {
    const aarligYdelse = this.beregnMaanedligYdelse() * 12;
    return lejeindtaegt - udgifter - aarligYdelse;
  }

  // Simulerer ejendomsværdi og cashflow år for år
  simuler(antalAar, lejeindtaegt, udgifter) {
    const resultater = [];
    for (let aar = 0; aar <= antalAar; aar++) {
      const ejendomsvaerdi = this.pris * Math.pow(1.02, aar);
      const cashflow = this.beregnAarligtCashflow(lejeindtaegt, udgifter);
      resultater.push({ aar, ejendomsvaerdi, cashflow });
    }
    return resultater;
  }
}

module.exports = InvestmentCalculator;