class InvestmentCalculator {
  constructor(pris, laanebeloeb, rentesats, loebetid_aar, lejeindtaegt, udgifter) {
    // rentesats forventes som decimalbrøk, fx 0.04 for 4%
    if (rentesats > 1) throw new Error("Rentesats skal være en decimalbrøk, fx 0.04 for 4%");
    this.pris = pris;
    this.laanebeloeb = laanebeloeb;
    this.rentesats = rentesats;
    this.loebetid_aar = loebetid_aar;
    this.lejeindtaegt = lejeindtaegt;
    this.udgifter = udgifter;
  }

  // Annuitetsformlen beregner fast månedlig ydelse (ekstern matematisk viden)
  beregnMaanedligYdelse() {
    if (this.rentesats < 0) throw new Error("Rentesats må ikke være negativ");
    const r = this.rentesats / 12;
    const n = this.loebetid_aar * 12;
    // 0% rente: ingen renteomkostning, lånet fordeles ligeligt over alle måneder
    if (r === 0) return this.laanebeloeb / n;
    return this.laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  // Årligt cashflow er lejeindtægt minus udgifter minus årlig låneydelse minus eventuelle renoveringer
  beregnAarligtCashflow(renoIAar = 0) {
    const aarligYdelse = this.beregnMaanedligYdelse() * 12;
    return this.lejeindtaegt - this.udgifter - aarligYdelse - renoIAar;
  }

  simuler(antalAar, renoveringer = []) {
    const resultater = [];
    // Restgæld starter som det fulde lånebeløb og nedbringes år for år
    let restgaeld = this.laanebeloeb;
    const maanedligYdelse = this.beregnMaanedligYdelse();
    const aarligYdelse = maanedligYdelse * 12;

    for (let aar = 0; aar <= antalAar; aar++) {
      // Ejendomsværdi vokser med 2% om året (ekstern antagelse om prisudvikling)
      const ejendomsvaerdi = this.pris * Math.pow(1.02, aar);

      if (aar > 0) {
        // Af den samlede ydelse går renteandelen til banken, resten er afdrag
        // Renteandelen falder over tid fordi restgælden falder
        const aarligRente  = restgaeld * this.rentesats;
        const aarligAfdrag = aarligYdelse - aarligRente;
        restgaeld = Math.max(0, restgaeld - aarligAfdrag);
      }

      // Renoveringer trækkes fra cashflow i det år de er planlagt
      const renoIAar = renoveringer
        .filter(r => r.planlagt_aar === aar)
        .reduce((sum, r) => sum + Number(r.beloeb), 0);

      const cashflow    = aar === 0 ? 0 : this.beregnAarligtCashflow(renoIAar);
      const egenkapital = ejendomsvaerdi - restgaeld;

      resultater.push({ aar, ejendomsvaerdi, cashflow, restgaeld, egenkapital });
    }
    return resultater;
  }
}

module.exports = InvestmentCalculator;