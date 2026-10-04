import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import extractRouter from "./routes/extract.js";
import repairRouter from "./routes/repair.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 8787;
const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");

// CORS: In development, open only for localhost. In production, frontend is served same-origin.
if (!isProduction) {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  }));
}

app.use(express.json({ limit: "1mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Memory extraction endpoint
app.use("/api/extract", extractRouter);

// Conversation repair endpoint
app.use("/api/repair", repairRouter);

// In production, serve the built frontend (single-service deployment)
const frontendDist = path.resolve(__dirname, "../frontend/dist");
if (isProduction || fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // Catch-all route to return index.html for non-API routes
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Endpoint not found" });
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Start listening if run directly (skipped in serverless environments like Vercel)
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

