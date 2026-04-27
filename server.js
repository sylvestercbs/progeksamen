const express = require("express");
const app = express();
const PORT = 3000;

// Gør Express i stand til at læse JSON i request body
app.use(express.json());

// Gør public-mappen tilgængelig for browseren (HTML, CSS, JS)
app.use(express.static("public"));

app.listen(PORT, () => {
    console.log(`Server kører på http://localhost:${PORT}`);
});