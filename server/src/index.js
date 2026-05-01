import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { extractCvText } from "./extractText.js";
import { runApplicationAgent } from "./agent.js";
import { saveRun } from "./database.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const upload = multer({
  dest: "server/uploads",
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
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
