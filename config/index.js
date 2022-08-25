const dotenv = require("dotenv");
dotenv.config();

export const SpotifyConfig = {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    isConfigured: clientId && clientSecret
};