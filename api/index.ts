import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

app.use(
    express.json({
        verify: (req: any, _res: any, buf: any) => {
            req.rawBody = buf;
        },
    })
);

app.use(express.urlencoded({ extended: false }));

let isInitialized = false;

async function ensureInitialized() {
    if (!isInitialized) {
        try {
            console.log("Initializing routes...");
            await registerRoutes(httpServer, app);
            console.log("Routes initialized successfully.");

            app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
                const status = err.status || err.statusCode || 500;
                const message = err.message || "Internal Server Error";
                console.error("Handler error:", err);
                if (res.headersSent) return next(err);
                return res.status(status).json({ message, details: process.env.NODE_ENV !== "production" ? err.stack : undefined });
            });

            isInitialized = true;
        } catch (error) {
            console.error("Critical error during initialization:", error);
            throw error;
        }
    }
}

export default async function handler(req: any, res: any) {
    try {
        await ensureInitialized();
        app(req, res);
    } catch (error: any) {
        console.error("Vercel handler crashed:", error);
        res.status(500).json({
            message: "Function Initialization Failed",
            error: error.message,
            stack: process.env.NODE_ENV !== "production" ? error.stack : undefined
        });
    }
}
