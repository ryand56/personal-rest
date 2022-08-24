const express = require("express");
const router = express.Router();

const textMiddleware = require("plaintextparser");

router.post("/", textMiddleware, (req, res) => {
    console.log("repl.deploy" + req.text + req.get("Signature"));

    let line = await readlineSync();
    console.log(line);

    let ret = JSON.parse(line);

    await res.status(ret.status).end(ret.body);
    console.log("repl.deploy-success");
});

module.exports = router;