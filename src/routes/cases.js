const express = require("express");
const router = express.Router();

// Placeholder routes, logik kommer i controllers
router.get("/", (req, res) => {
    res.json({ message: "Hent alle cases" });
});

router.get("/:id", (req, res) => {
    res.json({ message: `Hent case ${req.params.id}` });
});

router.post("/", (req, res) => {
    res.json({ message: "Gem ny case" });
});

router.put("/:id", (req, res) => {
    res.json({ message: `Opdatér case ${req.params.id}` });
});

router.post("/:id/simulate", (req, res) => {
    res.json({ message: `Kør simulation for case ${req.params.id}` });
});

module.exports = router;