// Testfiler bruger CommonJS (require/module.exports) fremfor ES-moduler (import/export).
// Jest opererer som standard i et CommonJS-miljø — ES-moduler kræver ekstra konfiguration
// der ligger uden for kursets pensum. Applikationskoden benytter ES-moduler (forelæsning 7).
const { InvestmentCalculator, Laan } = require("../src/models/investmentCalculator");

// Test 1: månedlig ydelse er et positivt tal ved gyldige input
test("beregnMaanedligYdelse returnerer positivt tal", () => {
  const calc = new InvestmentCalculator(2500000, [new Laan(2000000, 0.0425, 30)], 0, 0);
  const ydelse = calc.beregnMaanedligYdelse();
  expect(ydelse).toBeGreaterThan(0);
});

// Test 2: negativ rente er ugyldigt input, testen verificerer at systemet afviser det i Laan-constructor
test("Laan-constructor fejler ved negativ rente", () => {
  expect(() => new Laan(2000000, -0.05, 30)).toThrow();
});

// Test 3: simuler returnerer det rigtige antal år
test("simuler returnerer korrekt antal rækker", () => {
  const calc = new InvestmentCalculator(2500000, [new Laan(2000000, 0.0425, 30)], 120000, 30000);
  const resultater = calc.simuler(10);
  expect(resultater).toHaveLength(11);
});

// Test 4: positivt cashflow når lejeindtægt er større end ydelse og udgifter tilsammen
test("beregnAarligtCashflow er positiv ved høj lejeindtægt", () => {
  const calc = new InvestmentCalculator(2500000, [new Laan(2000000, 0.0425, 30)], 200000, 10000);
  const aarligYdelse = calc.beregnMaanedligYdelse() * 12;
  expect(calc.beregnAarligtCashflow(aarligYdelse)).toBeGreaterThan(0);
});

// Test 5: negativt cashflow er en gyldig case og ikke en fejl — lav leje er en reel investeringsrisiko
test("beregnAarligtCashflow er negativ ved lav lejeindtægt", () => {
  const calc = new InvestmentCalculator(2500000, [new Laan(2000000, 0.0425, 30)], 10000, 5000);
  const aarligYdelse = calc.beregnMaanedligYdelse() * 12;
  expect(calc.beregnAarligtCashflow(aarligYdelse)).toBeLessThan(0);
});
