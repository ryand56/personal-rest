const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.json({ status: "OK" });
});

app.listen(3000, () => {
    console.log("Listening");
});