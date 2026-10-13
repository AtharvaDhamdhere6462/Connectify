import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import dotenv from "dotenv";

import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);

connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
    server.listen(app.get("port"), () => {
        console.log("LISTENING ON PORT 8000");
    });

    try {
        const connectionDb = await mongoose.connect(process.env.MONGO_URL, {
            serverSelectionTimeoutMS: 2500
        });
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
    } catch (error) {
        console.log("Remote MongoDB Atlas Connection Failed:", error.message || error);
        try {
            const localDb = await mongoose.connect("mongodb://127.0.0.1:27017/connectify");
            console.log(`Fallback MONGO Connected DB Host: ${localDb.connection.host}`);
        } catch (localErr) {
            console.log("Local MongoDB Connection Failed as well:", localErr.message || localErr);
        }
    }
};

start();