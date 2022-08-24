const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.status(204).end();
});

router.get("/authorize", (req, res) => {
    res.status(204).end();
});

router.get("*", (req, res) => {
    res.status(404).json({ success: false, message: "NOT_FOUND" });
});

module.exports = router;