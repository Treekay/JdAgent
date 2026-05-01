import { ObjectId } from "mongodb";
import { MongoClient } from "mongodb";

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
    db.collection("cvs").createIndex({ createdAt: -1 })
  ]);
  return db;
}

export async function saveCv(cv) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("cvs").insertOne({
    ...cv,
    createdAt: new Date()
  });

  return result.insertedId;
}

export async function listCvs() {
  const database = await connectDatabase();
  if (!database) {
    return [];
  }

  const cvs = await database
    .collection("cvs")
    .find({}, { projection: { text: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return cvs.map((cv) => ({
    ...cv,
    _id: cv._id.toString()
  }));
}

export async function getCv(id) {
  const database = await connectDatabase();
  requireDatabase(database);

  return database.collection("cvs").findOne({ _id: toObjectId(id) });
}

export async function deleteCv(id) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("cvs").deleteOne({ _id: toObjectId(id) });
  return result.deletedCount > 0;
}

export async function saveRun(run) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("runs").insertOne({
    ...run,
    createdAt: new Date()
  });

  return result.insertedId;
}

export async function listRuns(limit = 20) {
  const database = await connectDatabase();
  if (!database) {
    return [];
  }

  const runs = await database
    .collection("runs")
    .find(
      {},
      {
        projection: {
          cvText: 0
        }
      }
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return runs.map((run) => ({
    ...run,
    _id: run._id.toString(),
    cvId: run.cvId?.toString?.() || run.cvId || null,
    displayTitle: runDisplayTitle(run)
  }));
}

export async function deleteRun(id) {
  const database = await connectDatabase();
  requireDatabase(database);

  const result = await database.collection("runs").deleteOne({ _id: toObjectId(id) });
  return result.deletedCount > 0;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}
