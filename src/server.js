require("dotenv").config();
const express = require("express");
const path = require("path");
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

const ejendommeRouter = require("./routes/ejendomme");
app.use("/api/ejendomme", ejendommeRouter);

// NYT: kort API
const kortRouter = require("./routes/kort");
app.use("/api/kort", kortRouter);

const laanRouter = require("./routes/laan");
app.use("/api/laan", laanRouter);

const driftsomkostningerRouter = require("./routes/driftsomkostninger");
app.use("/api/driftsomkostninger", driftsomkostningerRouter);

const udlejningRouter = require("./routes/udlejning");
app.use("/api/udlejning", udlejningRouter);

const renoveringerRouter = require("./routes/renoveringer");
app.use("/api/renoveringer", renoveringerRouter);

app.get("/ejendomme", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/ejendomsOversigt.html"));
});

app.listen(PORT, async () => {
    console.log(`Server kører på http://localhost:${PORT}`);
    try {
        await db.connect();
        console.log("Database forbundet");
    } catch (err) {
        console.error("Kunne ikke forbinde til database:", err.message);
        console.error("Serveren kører videre, men API-kald vil fejle.");
    }
});