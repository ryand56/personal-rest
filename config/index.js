exports.BaseUrl = process.env.BASE_URL || "http://localhost:3000";

exports.FirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MSG_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || ""
};

exports.SpotifyConfig = {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ""
};