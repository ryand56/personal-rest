const express = require("express");
const router = express.Router();

const axios = require("axios");
const fs = require("fs");

const { BaseUrl, SpotifyConfig } = require("../config");
const app = require("../config/firebase");
const { getFirestore } = require("firebase-admin/firestore");

async function refreshToken()
{
    if (SpotifyConfig.clientId !== "" && SpotifyConfig.clientSecret !== "")
    {
        const db = getFirestore(app);
        const docRef = db.collection("api").doc("spotify");

        const raw = await docRef.get();
        const tokens = raw.data();

        if (!tokens || !tokens.refresh) throw new Error("No tokens");

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
    }
}

router.get("/", async (req, res) => {
    if (SpotifyConfig.clientId === "" || SpotifyConfig.clientSecret === "") return res.status(500).json({
        success: false,
        message: "Not configured"
    });

    const db = getFirestore(app);
    const docRef = db.collection("api").doc("spotify");

    const raw = await docRef.get();
    const tokens = raw.data();

    if (!tokens) return res.status(500).json({ success: false });

    if (!tokens.accessToken || !tokens.refreshToken) return res.status(401).json({ success: false, message: "Not authorized" });

    try
    {
        const ret = await axios.default.get("https://api.spotify.com/v1/me/player", {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`
            }
        });

        if (ret.status < 200 || ret.status >= 400) return res.status(ret.status).json({ success: false });
        else if (ret.status === 204) return res.json({ success: true, data: { is_playing: false } });
        else
        {
            let item_author = "";

            const authors = ret.data?.item?.artists ?? null;
            if (authors !== null)
            {
                for (var i = 0; i < authors.length; i++)
                {
                    const author = authors[i];

                    if (i === (authors.length - 1))
                    {
                        item_author += author.name;
                    }
                    else
                    {
                        item_author += `${author.name}, `;
                    }
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
    }
    catch (e)
    {
        res.status(403).json({ success: false });
    }
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

    const db = getFirestore(app);
    const docRef = db.collection("api").doc("spotify");

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
        await docRef.set({
            accessToken: ret.data.access_token,
            refreshToken: ret.data.refresh_token
        });
    }

    res.json({ success: true });
});

router.get("/refresh", (req, res) => {
    try
    {
        refreshToken();
        res.status(204).end();
    }
    catch (e)
    {
        res.status(500).end();
    }
});

router.get("*", (req, res) => {
    res.status(404).json({ success: false, message: "NOT_FOUND" });
});

module.exports = router;