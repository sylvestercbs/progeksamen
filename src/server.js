const express = require("express");
const app = express();
const PORT = 3000;

// Læser JSON i request body
app.use(express.json());

// Serverer frontend filer fra public mappen
app.use(express.static("public"));

app.listen(PORT, () => {
    console.log(`Server kører på http://localhost:${PORT}`);
});
