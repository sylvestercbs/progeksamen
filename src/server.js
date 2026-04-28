require("dotenv").config();
const express = require("express");
const app = express();
const PORT = 3000;
const db = require("./models/database");

app.use(express.json());
app.use(express.static("public"));
app.use("/dawa", express.static("node_modules/dawa-autocomplete2/dist/js"));

const casesRouter = require("./routes/cases");
app.use("/api/cases", casesRouter);

const bbrRouter = require('./routes/bbr');
app.use('/api/bbr', bbrRouter);

// NYT: kort API
const kortRouter = require("./routes/kort");
app.use("/api/kort", kortRouter);

app.listen(PORT, async () => {
    console.log(`Server kører på http://localhost:${PORT}`);
    await db.connect();
    console.log("Database forbundet");
});