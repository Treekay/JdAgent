import { ObjectId } from "mongodb";
import { MongoClient } from "mongodb";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

let client;
let db;

function requireDatabase(database) {
  if (!database) {
    throw new Error("MONGO_URI is required for saved CVs and run history.");
  }
}

function toObjectId(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid id.");
  }

  return new ObjectId(id);
}

function runDisplayTitle(run) {
  const companyName = run.companyName || run.result?.companyName || "";
  const roleTitle = run.roleTitle || run.result?.roleTitle || "";

  if (companyName && roleTitle) return `${companyName} - ${roleTitle}`;
  return companyName || roleTitle || "Saved match";
}

const APPLICATION_STATUSES = new Set(["saved", "applied", "interview", "result"]);
const STAGE_DATA_FIELDS = new Set([
  "appliedNote",
  "interviewNotes",
  "interviewFeedback",
  "interviewRounds",
  "resultStatus",
  "resultReason",
  "improvementAreas",
  "nextAction",
  "resultReflection"
]);
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

function serializeRun(run) {
  return {
    ...run,
    _id: run._id.toString(),
    cvId: run.cvId?.toString?.() || run.cvId || null,
    applicationStatus: APPLICATION_STATUSES.has(run.applicationStatus)
      ? run.applicationStatus
      : "saved",
    stageData: run.stageData || {},
    displayTitle: runDisplayTitle(run)
  };
}

function statusTimestampField(status) {
  if (status === "applied") return "appliedAt";
  if (status === "interview") return "interviewAt";
  if (status === "result") return "resultAt";
  return null;
}

function sanitizeString(value, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeInterviewRounds(rounds) {
  if (!Array.isArray(rounds)) {
    return [];
  }

  return rounds.slice(0, 8).map((round, index) => ({
    id: sanitizeString(round?.id, 80) || `round-${index + 1}`,
    roundName: sanitizeString(round?.roundName, 120) || `Round ${index + 1}`,
    date: sanitizeString(round?.date, 40),
    interviewer: sanitizeString(round?.interviewer, 160),
    questions: sanitizeString(round?.questions),
    feedback: sanitizeString(round?.feedback)
  }));
}

function sanitizeStringArray(items, maxItems = 8, maxLength = 200) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => sanitizeString(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function sanitizeStageValue(key, value) {
  if (key === "interviewRounds") {
    return sanitizeInterviewRounds(value);
  }

  if (key === "improvementAreas") {
    return sanitizeStringArray(value, 8, 80);
  }

  return typeof value === "string" ? sanitizeString(value) : value;
}

function sanitizeCoachInsights(insights = {}) {
  return {
    status: sanitizeString(insights.status, 40),
    headline: sanitizeString(insights.headline, 220),
    summary: sanitizeString(insights.summary, 1600),
    strengths: sanitizeStringArray(insights.strengths, 6, 240),
    risks: sanitizeStringArray(insights.risks, 6, 240),
    nextActions: sanitizeStringArray(insights.nextActions, 8, 260),
    focusAreas: sanitizeStringArray(insights.focusAreas, 6, 120),
    generatedAt: sanitizeString(insights.generatedAt, 80) || new Date().toISOString()
  };
}

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    return null;
  }

  if (db) {
    return db;
  }

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db(process.env.MONGO_DB || "job_assistant");
  await Promise.all([
    db.collection("runs").createIndex({ createdAt: -1 }),
    db.collection("runs").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("cvs").createIndex({ createdAt: -1 }),
    db.collection("cvs").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("users").createIndex({ username: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ createdAt: 1 })
  ]);
  return db;
}

function toUserId(userId) {
  return userId instanceof ObjectId ? userId : toObjectId(userId);
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(
    password,
    salt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LENGTH,
    PASSWORD_DIGEST
  ).toString("hex");

  return { salt, hash };
}

function passwordMatches(password, user) {
  const next = hashPassword(password, user.passwordSalt).hash;
  return timingSafeEqual(Buffer.from(next, "hex"), Buffer.from(user.passwordHash, "hex"));
}

export async function createUser({ username, password }) {
  const database = await connectDatabase();
  requireDatabase(database);

  const normalizedUsername = username.trim().toLowerCase();
  const { salt, hash } = hashPassword(password);
  const result = await database.collection("users").insertOne({
    username: normalizedUsername,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date()
  });

  return {
    _id: result.insertedId.toString(),
    username: normalizedUsername
  };
}

export async function findUserByCredentials({ username, password }) {
  const database = await connectDatabase();
  requireDatabase(database);

  const normalizedUsername = username.trim().toLowerCase();
  const user = await database.collection("users").findOne({ username: normalizedUsername });

  if (!user || !passwordMatches(password, user)) {
    return null;
  }

  return {
    _id: user._id.toString(),
    username: user.username
  };
}

export async function createSession(userId) {
  const database = await connectDatabase();
  requireDatabase(database);

  const token = randomBytes(32).toString("hex");
  await database.collection("sessions").insertOne({
    token,
    userId: toUserId(userId),
    createdAt: new Date()
  });

  return token;
}

export async function getSessionUser(token) {
  const database = await connectDatabase();
  requireDatabase(database);

  const session = await database.collection("sessions").findOne({ token });
  if (!session) {
    return null;
  }

  const user = await database.collection("users").findOne({ _id: session.userId });
  if (!user) {
    return null;
  }

  return {
    _id: user._id.toString(),
    username: user.username
  };
}

export async function deleteSession(token) {
  const database = await connectDatabase();
  requireDatabase(database);

  await database.collection("sessions").deleteOne({ token });
}

export async function saveCv(userId, cv) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("cvs").insertOne({
    ...cv,
    userId: toUserId(userId),
    createdAt: new Date()
  });

  return result.insertedId;
}

export async function listCvs(userId) {
  const database = await connectDatabase();
  if (!database) {
    return [];
  }

  const cvs = await database
    .collection("cvs")
    .find({ userId: toUserId(userId) }, { projection: { text: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return cvs.map((cv) => ({
    ...cv,
    _id: cv._id.toString()
  }));
}

export async function getCv(userId, id) {
  const database = await connectDatabase();
  requireDatabase(database);

  return database.collection("cvs").findOne({ _id: toObjectId(id), userId: toUserId(userId) });
}

export async function deleteCv(userId, id) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("cvs").deleteOne({
    _id: toObjectId(id),
    userId: toUserId(userId)
  });
  return result.deletedCount > 0;
}

export async function saveRun(userId, run) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("runs").insertOne({
    applicationStatus: "saved",
    statusHistory: [{ status: "saved", changedAt: new Date() }],
    stageData: {},
    ...run,
    userId: toUserId(userId),
    createdAt: new Date()
  });

  return result.insertedId;
}

export async function listRuns(userId, limit = 20) {
  const database = await connectDatabase();
  if (!database) {
    return [];
  }

  const runs = await database
    .collection("runs")
    .find(
      { userId: toUserId(userId) },
      {
        projection: {
          cvText: 0
        }
      }
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return runs.map(serializeRun);
}

export async function updateRunStatus(userId, id, status) {
  const database = await connectDatabase();
  requireDatabase(database);

  if (!APPLICATION_STATUSES.has(status)) {
    throw new Error("Invalid application status.");
  }

  const _id = toObjectId(id);
  const userObjectId = toUserId(userId);
  const existingRun = await database.collection("runs").findOne(
    { _id, userId: userObjectId },
    {
      projection: {
        appliedAt: 1,
        interviewAt: 1,
        resultAt: 1
      }
    }
  );

  if (!existingRun) {
    return null;
  }

  const now = new Date();
  const timestampField = statusTimestampField(status);
  const setFields = {
    applicationStatus: status,
    updatedAt: now
  };

  if (timestampField && !existingRun[timestampField]) {
    setFields[timestampField] = now;
  }

  await database.collection("runs").updateOne(
    { _id, userId: userObjectId },
    {
      $set: setFields,
      $push: {
        statusHistory: { status, changedAt: now }
      }
    }
  );

  const run = await database.collection("runs").findOne(
    { _id, userId: userObjectId },
    {
      projection: {
        cvText: 0
      }
    }
  );

  if (!run) {
    return null;
  }

  return serializeRun(run);
}

export async function updateRunStageData(userId, id, updates = {}) {
  const database = await connectDatabase();
  requireDatabase(database);

  const _id = toObjectId(id);
  const now = new Date();
  const setFields = {
    updatedAt: now
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (!STAGE_DATA_FIELDS.has(key)) {
      return;
    }

    setFields[`stageData.${key}`] = sanitizeStageValue(key, value);
  });

  if (Object.keys(setFields).length === 1) {
    throw new Error("No supported stage data fields were provided.");
  }

  await database.collection("runs").updateOne(
    { _id, userId: toUserId(userId) },
    {
      $set: setFields
    }
  );

  const run = await database.collection("runs").findOne(
    { _id, userId: toUserId(userId) },
    {
      projection: {
        cvText: 0
      }
    }
  );

  if (!run) {
    return null;
  }

  return serializeRun(run);
}

export async function getRun(userId, id) {
  const database = await connectDatabase();
  requireDatabase(database);

  return database.collection("runs").findOne({
    _id: toObjectId(id),
    userId: toUserId(userId)
  });
}

export async function saveRunCoachInsights(userId, id, insights) {
  const database = await connectDatabase();
  requireDatabase(database);

  const _id = toObjectId(id);
  const userObjectId = toUserId(userId);
  await database.collection("runs").updateOne(
    { _id, userId: userObjectId },
    {
      $set: {
        coachInsights: sanitizeCoachInsights(insights),
        updatedAt: new Date()
      }
    }
  );

  const run = await database.collection("runs").findOne(
    { _id, userId: userObjectId },
    {
      projection: {
        cvText: 0
      }
    }
  );

  if (!run) {
    return null;
  }

  return serializeRun(run);
}

export async function deleteRun(userId, id) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("runs").deleteOne({
    _id: toObjectId(id),
    userId: toUserId(userId)
  });
  return result.deletedCount > 0;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}
