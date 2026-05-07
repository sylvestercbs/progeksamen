require("dotenv").config({ quiet: true });

const db = require("../src/models/database");

const requiredTables = [
  "Driftsomkostning",
  "Ejendom",
  "Ejendomsprofil",
  "Investeringscase",
  "Laan",
  "Renovering",
  "Simulering",
  "Udlejning",
];

(async () => {
  try {
    await db.connect();
    console.log("Database forbundet");

    const result = await db.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'EjendomInvestApp'
       ORDER BY TABLE_NAME`
    );

    const tables = result.recordset.map((row) => row.TABLE_NAME);
    const missingTables = requiredTables.filter((table) => !tables.includes(table));

    if (missingTables.length) {
      throw new Error(`Mangler tabeller i EjendomInvestApp: ${missingTables.join(", ")}`);
    }

    console.log(`Schema OK: ${tables.length} tabeller fundet i EjendomInvestApp`);
  } catch (err) {
    console.error("Databasecheck fejlede:", err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
