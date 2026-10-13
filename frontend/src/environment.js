const IS_PROD =
    process.env.NODE_ENV === "production" ||
    (typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1");

const server = IS_PROD
    ? "https://connectifybackend-cmof.onrender.com"
    : "http://localhost:8000";

export default server;