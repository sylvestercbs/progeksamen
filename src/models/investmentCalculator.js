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

  simuler(antalAar, lejeindtaegt, udgifter) {
  const resultater = [];
  // Restgæld starter som det fulde lånebeløb og nedbringes år for år
  let restgaeld = this.laanebeloeb;
  const maanedligYdelse = this.beregnMaanedligYdelse();

  for (let aar = 0; aar <= antalAar; aar++) {
    // Ejendomsværdi vokser med 2% om året (ekstern antagelse om prisudvikling)
    const ejendomsvaerdi = this.pris * Math.pow(1.02, aar);
    const cashflow = this.beregnAarligtCashflow(lejeindtaegt, udgifter);

    // Af den samlede ydelse går renteandelen til banken, resten er afdrag
    // Renteandelen falder over tid fordi restgælden falder
    const aarligRente = restgaeld * this.rentesats;
    const aarligAfdrag = (maanedligYdelse * 12) - aarligRente;
    restgaeld = Math.max(0, restgaeld - aarligAfdrag);

    // Egenkapital er hvad der er tilbage hvis ejendommen sælges og gælden betales
    const egenkapital = ejendomsvaerdi - restgaeld;

    resultater.push({ aar, ejendomsvaerdi, cashflow, restgaeld, egenkapital });
  }
  return resultater;
}
}

module.exports = InvestmentCalculator;