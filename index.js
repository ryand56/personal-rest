const express = require("express");
const app = express();

const deploy = require("./routes/deploy");
const spotify = require("./routes/spotify");
app.use("/refresh", deploy);
app.use("/spotify", spotify);

app.get("/", (req, res) => {
    res.json({ status: "OK" });
});

app.listen(3000, () => {
    console.log("Listening");
});