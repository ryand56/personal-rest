const dotenv = require("dotenv");
dotenv.config();

exports.BaseUrl = process.env.BASE_URL || "http://localhost";

exports.SpotifyConfig = {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ""
};