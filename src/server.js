require("dotenv").config();
const express = require("express");
const app = express();
const PORT = 3000;
const db = require("./models/database");

// Læser JSON i request body
app.use(express.json());

// Serverer frontend filer fra public mappen
app.use(express.static("public"));

app.listen(PORT, async () => {
    console.log(`Server kører på http://localhost:${PORT}`);
    await db.connect();
    console.log("Database forbundet");
});
