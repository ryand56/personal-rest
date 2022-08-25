const express = require("express");
const router = express.Router();

const axios = require("axios");
const fs = require("fs");
const { BaseUrl, SpotifyConfig } = require("../config");

router.get("/", (req, res) => {
    res.status(204).end();
});

router.get("/authorize", (req, res) => {
    if (SpotifyConfig.clientId === "" || SpotifyConfig.clientSecret === "") return res.status(500).json({
        success: false,
        message: "Not configured"
    });

    const query = new URLSearchParams({
        response_type: "code",
        client_id: SpotifyConfig.clientId,
        scope: encodeURIComponent("user-read-playback-state user-read-currently-playing"),
        redirect_uri: `${BaseUrl}/spotify/callback`
    }).toString();

    res.redirect(`https://accounts.spotify.com/authorize?${query}`);
});

router.get("/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).json({ success: false, message: "Code not provided" });

    const body = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: `${BaseUrl}/spotify/callback`
    }).toString();

    const ret = await axios.default.post("https://accounts.spotify.com/api/token", body, {
        headers: {
            Authorization: `Basic ${Buffer.from(`${SpotifyConfig.clientId}:${SpotifyConfig.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });

    if (ret.status < 200 || ret.status >= 400) return res.status(500).json({ success: false, message: "Token exchange failed" });
    
    if (ret.data.access_token && ret.data.refresh_token)
    {
        if (!fs.existsSync("./tokenConfig")) fs.mkdirSync("./tokenConfig");
        fs.writeFileSync("./tokenConfig/.spotify", JSON.stringify({ access: ret.data.access_token, refresh: ret.data.refresh_token }));
    }

    res.json({ success: true });
});

router.get("*", (req, res) => {
    res.status(404).json({ success: false, message: "NOT_FOUND" });
});

module.exports = router;