import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import extractRouter from "./routes/extract.js";
import repairRouter from "./routes/repair.js";

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 8787;

// Middleware: CORS and 1MB JSON body limit
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Memory extraction endpoint
app.use("/api/extract", extractRouter);

// Conversation repair endpoint
app.use("/api/repair", repairRouter);

// Start listening if run directly
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
