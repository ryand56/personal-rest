const express = require("express");
const router = express.Router();

const axios = require("axios");
const fs = require("fs");
const { BaseUrl, SpotifyConfig } = require("../config");

async function refreshToken()
{
    return new Promise((resolve, reject) => {
        if (SpotifyConfig.clientId !== "" && SpotifyConfig.clientSecret !== "")
        {
            fs.readFile("config/tokenConfig/.spotify", async (err, data) => {
                if (err) reject();

                const tokens = JSON.parse(data);
                if (!tokens.refresh) reject();

                const query = new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: tokens.refresh
                }).toString();

                const ret = await axios.default.post("https://accounts.spotify.com/api/token", query, {
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${SpotifyConfig.clientId}:${SpotifyConfig.clientSecret}`).toString("base64")}`,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });

                if (ret.status >= 200 && ret.status < 400)
                {
                    const toWrite = JSON.stringify({
                        access: ret.data.access_token,
                        refresh: tokens.refresh
                    });

                    fs.writeFile("config/tokenConfig/.spotify", toWrite, errWr => {
                        if (err) reject();
                        resolve();
                    });
                }
            });
        }
    });
}

router.get("/", (req, res) => {
    if (SpotifyConfig.clientId === "" || SpotifyConfig.clientSecret === "") return res.status(500).json({
        success: false,
        message: "Not configured"
    });

    fs.readFile("config/tokenConfig/.spotify", async (err, data) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to read spotify token file" });
        
        const tokens = JSON.parse(data);

        if (!tokens.access || !tokens.refresh) return res.status(401).json({ success: false, message: "Not authorized" });

        const ret = await axios.default.get("https://api.spotify.com/v1/me/player", {
            headers: {
                Authorization: `Bearer ${tokens.access}`
            }
        });

        if (ret.status < 200 || ret.status >= 400) return res.status(ret.status).json({ success: false });
        else if (ret.status === 204) return res.json({ success: true, data: { is_playing: false } });
        else
        {
            let item_author = "";

            const authors = ret.data?.item?.authors ?? null;
            if (authors !== null)
            {
                for (var i = 0; i < authors.length; i++)
                {
                    const author = authors[i];

                    if (i === (authors.length - 1))
                    {
                        item_author += author.name;
                    }

                    item_author += `${author.name}, `;
                }
            }

            return res.json({
                success: true,
                data: {
                    is_playing: ret.data?.is_playing,
                    device_name: ret.data?.device?.name ?? null,
                    device_type: ret.data?.device?.type ?? null,
                    item_name: ret.data?.item?.name ?? null,
                    item_type: ret.data?.item?.type ?? null,
                    item_author,
                    item_id: ret.data?.item?.id ?? null,
                    item_progress: ret.data?.progress_ms ?? null,
                    item_length_ms: ret.data?.item?.duration_ms ?? null,
                    started_at: ret.data?.timestamp ?? null
                }
            });
        }
    });
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
        if (!fs.existsSync("config/tokenConfig")) fs.mkdirSync("config/tokenConfig");
        fs.writeFileSync("config/tokenConfig/.spotify", JSON.stringify({ access: ret.data.access_token, refresh: ret.data.refresh_token }));
    }

    res.json({ success: true });
});

router.get("/refresh", (req, res) => {
    refreshToken().then(() => {
        res.status(204).end();
    }).catch(() => {
        res.status(500).end();
    });
});

router.get("*", (req, res) => {
    res.status(404).json({ success: false, message: "NOT_FOUND" });
});

module.exports = router;