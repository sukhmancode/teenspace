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
        await registerRoutes(httpServer, app);

        app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
            const status = err.status || err.statusCode || 500;
            const message = err.message || "Internal Server Error";
            if (res.headersSent) return next(err);
            return res.status(status).json({ message });
        });

        isInitialized = true;
    }
}

export default async function handler(req: any, res: any) {
    await ensureInitialized();
    app(req, res);
}
