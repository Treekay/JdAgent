import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractCvText } from "./extractText.js";
import { runApplicationAgent } from "./agent.js";
import { listRuns, saveRun } from "./database.js";

dotenv.config();

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(currentDir, "../uploads");
const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ]
);
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/applications/runs", async (_request, response) => {
  try {
    const runs = await listRuns();
    response.json({ runs });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      message: "Could not load previous runs.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

app.post("/api/applications/run", upload.single("cv"), async (request, response) => {
  try {
    const jobDescription = request.body.jobDescription?.trim();

    if (!request.file) {
      return response.status(400).json({ message: "Upload a CV file first." });
    }

    if (!jobDescription) {
      return response.status(400).json({ message: "Paste a job description first." });
    }

    const cvText = await extractCvText(request.file);
    const result = await runApplicationAgent({ cvText, jobDescription });
    const runId = await saveRun({
      companyName: result.companyName || "",
      roleTitle: result.roleTitle || "",
      cvFileName: request.file.originalname,
      jobDescription,
      cvText,
      result
    });

    response.json({
      id: runId?.toString() || null,
      ...result
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      message: "The agent could not complete this run.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Job assistant API listening on http://localhost:${port}`);
});
