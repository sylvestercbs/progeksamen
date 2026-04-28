const { test } = require("node:test");
const assert = require("node:assert");
const InvestmentCalculator = require("../src/models/investmentCalculator");

// Test 1: månedlig ydelse er et positivt tal ved gyldige input
test("beregnMaanedligYdelse returnerer positivt tal", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, 0.0425, 30);
  const ydelse = calc.beregnMaanedligYdelse();
  assert.ok(ydelse > 0, "Ydelsen skal være større end 0");
});

// Test 2: negativ rente må ikke give en positiv ydelse
test("beregnMaanedligYdelse fejler ved negativ rente", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, -0.05, 30);
  const ydelse = calc.beregnMaanedligYdelse();
  assert.ok(isNaN(ydelse) || ydelse <= 0, "Negativ rente skal give ugyldigt resultat");
});

// Test 3: simuler returnerer det rigtige antal år
test("simuler returnerer korrekt antal rækker", () => {
  const calc = new InvestmentCalculator(2500000, 2000000, 0.0425, 30);
  const resultater = calc.simuler(10, 120000, 30000);
  assert.strictEqual(resultater.length, 11, "Skal returnere 11 rækker (år 0 til 10)");
});