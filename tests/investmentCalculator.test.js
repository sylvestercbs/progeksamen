// Testfiler bruger CommonJS (require/module.exports) fremfor ES-moduler (import/export).
// Jest opererer som standard i et CommonJS-miljø — ES-moduler kræver ekstra konfiguration
// der ligger uden for kursets pensum. Applikationskoden benytter ES-moduler (forelæsning 7).
const InvestmentCalculator = require("../src/models/investmentCalculator");

// Test 1: månedlig ydelse er et positivt tal ved gyldige input
test("beregnMaanedligYdelse returnerer positivt tal", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, 0.0425, 30, 0, 0);
  const ydelse = calc.beregnMaanedligYdelse();
  expect(ydelse).toBeGreaterThan(0);
});

// Test 2: negativ rente er ugyldigt input, testen verificerer at systemet afviser det
test("beregnMaanedligYdelse fejler ved negativ rente", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, -0.05, 30, 0, 0);
  expect(() => calc.beregnMaanedligYdelse()).toThrow();
});

// Test 3: simuler returnerer det rigtige antal år
test("simuler returnerer korrekt antal rækker", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, 0.0425, 30, 120000, 30000);
  const resultater = calc.simuler(10);
  expect(resultater).toHaveLength(11);
});

// Test 4: positivt cashflow når lejeindtægt er større end ydelse og udgifter tilsammen
test("beregnAarligtCashflow er positiv ved høj lejeindtægt", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, 0.0425, 30, 200000, 10000);
  const cashflow = calc.beregnAarligtCashflow();
  expect(cashflow).toBeGreaterThan(0);
});

// Test 5: negativt cashflow er en gyldig case og ikke en fejl — lav leje er en reel investeringsrisiko
test("beregnAarligtCashflow er negativ ved lav lejeindtægt", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, 0.0425, 30, 10000, 5000);
  const cashflow = calc.beregnAarligtCashflow();
  expect(cashflow).toBeLessThan(0);
});
