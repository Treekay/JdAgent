import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractCvText } from "./extractText.js";
import { runApplicationAgent } from "./agent.js";
import {
  createSession,
  createUser,
  deleteCv,
  deleteRun,
  deleteSession,
  findUserByCredentials,
  getCv,
  getSessionUser,
  listCvs,
  listRuns,
  saveCv,
  saveRun,
  updateRunStageData,
  updateRunStatus
} from "./database.js";

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

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadJobDescription({ jobDescription = "", jobUrl = "" }) {
  const pastedDescription = jobDescription.trim();
  const url = jobUrl.trim();

  if (pastedDescription) {
    return pastedDescription;
  }

  if (!url) {
    return "";
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ApplyAgent/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not load job URL (${response.status}).`);
  }

  const content = await response.text();
  const type = response.headers.get("content-type") || "";
  return type.includes("html") ? stripHtml(content) : content.trim();
}

function asyncRoute(handler) {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      console.error(error);
      response.status(500).json({
        message: error.message || "Request failed.",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
        agentTrace: error.agentTrace
      });
    }
  };
}

function validateCredentials({ username = "", password = "" }) {
  const normalizedUsername = username.trim().toLowerCase();

  if (normalizedUsername.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  return { username: normalizedUsername, password };
}

function getBearerToken(request) {
  const header = request.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function requireAuth(request, response, next) {
  try {
    const token = getBearerToken(request);
    const user = token ? await getSessionUser(token) : null;

    if (!user) {
      response.status(401).json({ message: "Login required." });
      return;
    }

    request.auth = { token, user };
    next();
  } catch (error) {
    next(error);
  }
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
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post(
  "/api/auth/register",
  asyncRoute(async (request, response) => {
    let credentials;

    try {
      credentials = validateCredentials(request.body);
    } catch (error) {
      response.status(400).json({ message: error.message });
      return;
    }

    try {
      const user = await createUser(credentials);
      const token = await createSession(user._id);
      response.status(201).json({ token, user });
    } catch (error) {
      if (error.code === 11000) {
        response.status(409).json({ message: "Username is already taken." });
        return;
      }

      throw error;
    }
  })
);

app.post(
  "/api/auth/login",
  asyncRoute(async (request, response) => {
    let credentials;

    try {
      credentials = validateCredentials(request.body);
    } catch (error) {
      response.status(400).json({ message: error.message });
      return;
    }

    const user = await findUserByCredentials(credentials);

    if (!user) {
      response.status(401).json({ message: "Invalid username or password." });
      return;
    }

    const token = await createSession(user._id);
    response.json({ token, user });
  })
);

app.get(
  "/api/auth/me",
  requireAuth,
  asyncRoute(async (request, response) => {
    response.json({ user: request.auth.user });
  })
);

app.post(
  "/api/auth/logout",
  requireAuth,
  asyncRoute(async (request, response) => {
    await deleteSession(request.auth.token);
    response.json({ ok: true });
  })
);

app.use("/api/cvs", requireAuth);
app.use("/api/applications", requireAuth);

app.get(
  "/api/cvs",
  asyncRoute(async (_request, response) => {
    response.json({ cvs: await listCvs(_request.auth.user._id) });
  })
);

app.post(
  "/api/cvs",
  upload.single("cv"),
  asyncRoute(async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Upload a CV file first." });
      return;
    }

    const text = await extractCvText(request.file);
    const cvId = await saveCv(request.auth.user._id, {
      fileName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      text
    });

    response.status(201).json({
      cv: {
        _id: cvId.toString(),
        fileName: request.file.originalname,
        mimeType: request.file.mimetype,
        size: request.file.size,
        createdAt: new Date().toISOString()
      }
    });
  })
);

app.delete(
  "/api/cvs/:id",
  asyncRoute(async (request, response) => {
    const deleted = await deleteCv(request.auth.user._id, request.params.id);
    response.json({ deleted });
  })
);

app.get(
  "/api/applications/runs",
  asyncRoute(async (_request, response) => {
    response.json({ runs: await listRuns(_request.auth.user._id) });
  })
);

app.patch(
  "/api/applications/runs/:id/status",
  asyncRoute(async (request, response) => {
    const run = await updateRunStatus(request.auth.user._id, request.params.id, request.body.status);

    if (!run) {
      response.status(404).json({ message: "Match record was not found." });
      return;
    }

    response.json({ run });
  })
);

app.patch(
  "/api/applications/runs/:id/stage-data",
  asyncRoute(async (request, response) => {
    const run = await updateRunStageData(
      request.auth.user._id,
      request.params.id,
      request.body || {}
    );

    if (!run) {
      response.status(404).json({ message: "Match record was not found." });
      return;
    }

    response.json({ run });
  })
);

app.delete(
  "/api/applications/runs/:id",
  asyncRoute(async (request, response) => {
    const deleted = await deleteRun(request.auth.user._id, request.params.id);
    response.json({ deleted });
  })
);

app.post(
  "/api/applications/run",
  asyncRoute(async (request, response) => {
    const { cvId, jobDescription = "", jobUrl = "" } = request.body;

    if (!cvId) {
      response.status(400).json({ message: "Select or upload a CV first." });
      return;
    }

    const cv = await getCv(request.auth.user._id, cvId);
    if (!cv) {
      response.status(404).json({ message: "Selected CV was not found." });
      return;
    }

    const loadedJobDescription = await loadJobDescription({ jobDescription, jobUrl });
    if (!loadedJobDescription) {
      response.status(400).json({ message: "Paste a job description or provide a job link." });
      return;
    }

    const result = await runApplicationAgent({
      cvText: cv.text,
      jobDescription: loadedJobDescription,
      jobUrl
    });
    const runId = await saveRun(request.auth.user._id, {
      cvId: cv._id,
      cvFileName: cv.fileName,
      companyName: result.companyName || "",
      roleTitle: result.roleTitle || "",
      jobDescription: loadedJobDescription,
      jobUrl,
      result
    });

    response.json({
      id: runId.toString(),
      ...result
    });
  })
);

app.listen(port, () => {
  console.log(`Job assistant API listening on http://localhost:${port}`);
});
