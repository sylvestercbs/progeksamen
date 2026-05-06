class Renovering {
  constructor(planlagtAar, beloeb) {
    if (beloeb < 0) throw new Error("Renoveringsbeløb må ikke være negativt");
    this.planlagtAar = planlagtAar;
    this.beloeb = beloeb;
  }

  erPlanlagtIAar(aar) {
    return this.planlagtAar === aar;
  }
}

class InvestmentCalculator {
  constructor(pris, laanebeloeb, rentesats, loebetid_aar, lejeindtaegt, udgifter) {
    // rentesats forventes som decimalbrøk, fx 0.04 for 4%
    if (rentesats > 1) throw new Error("Rentesats skal være en decimalbrøk, fx 0.04 for 4%");
    if (rentesats < 0) throw new Error("Rentesats må ikke være negativ");
    this.pris = pris;
    this.laanebeloeb = laanebeloeb;
    this.rentesats = rentesats;
    this.loebetid_aar = loebetid_aar;
    this.lejeindtaegt = lejeindtaegt;
    this.udgifter = udgifter;
    this.renoveringer = [];
    this.vaekstrate = 0.02;
  }

  tilfoejRenovering(renovering) {
    this.renoveringer.push(renovering);
  }

  // Annuitetsformlen beregner fast månedlig ydelse (ekstern matematisk viden)
  beregnMaanedligYdelse() {
    const r = this.rentesats / 12;
    const n = this.loebetid_aar * 12;
    // 0% rente: ingen renteomkostning, lånet fordeles ligeligt over alle måneder
    if (r === 0) return this.laanebeloeb / n;
    return this.laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  beregnEjendomsvaerdi(aar) {
    return this.pris * Math.pow(1 + this.vaekstrate, aar);
  }

  // Af den samlede ydelse går renteandelen til banken, resten er afdrag
  // Renteandelen falder over tid fordi restgælden falder
  beregnNyRestgaeld(restgaeld, aarligYdelse) {
    const aarligRente  = restgaeld * this.rentesats;
    const aarligAfdrag = aarligYdelse - aarligRente;
    return Math.max(0, restgaeld - aarligAfdrag);
  }

  // Renoveringer trækkes fra cashflow i det år de er planlagt
  beregnRenoIAar(aar) {
    return this.renoveringer
      .filter(r => r.erPlanlagtIAar(aar))
      .reduce((sum, r) => sum + r.beloeb, 0);
  }

  // Årligt cashflow er lejeindtægt minus udgifter minus årlig låneydelse minus eventuelle renoveringer
  beregnAarligtCashflow(aarligYdelse, renoIAar = 0) {
    return this.lejeindtaegt - this.udgifter - aarligYdelse - renoIAar;
  }

  simuler(antalAar) {
    const resultater = [];
    let restgaeld = this.laanebeloeb;
    const aarligYdelse = this.beregnMaanedligYdelse() * 12;

    for (let aar = 0; aar <= antalAar; aar++) {
      const ejendomsvaerdi = this.beregnEjendomsvaerdi(aar);

      if (aar > 0) {
        restgaeld = this.beregnNyRestgaeld(restgaeld, aarligYdelse);
      }

      const renoIAar    = this.beregnRenoIAar(aar);
      const cashflow    = aar === 0 ? 0 : this.beregnAarligtCashflow(aarligYdelse, renoIAar);
      const egenkapital = ejendomsvaerdi - restgaeld;

      resultater.push({ aar, ejendomsvaerdi, cashflow, restgaeld, egenkapital });
    }
    return resultater;
  }
}

module.exports = { InvestmentCalculator, Renovering };
