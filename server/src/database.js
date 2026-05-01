import { MongoClient } from "mongodb";
import { extractJobInfo } from "./agent.js";

let client;
let db;

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
  await db.collection("runs").createIndex({ createdAt: -1 });
  return db;
}

export async function saveRun(run) {
  const database = await connectDatabase();
  if (!database) {
    return null;
  }

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

  return runs.map((run) => {
    const extracted = extractJobInfo(run.jobDescription || "");
    const companyName = run.companyName || run.result?.companyName || extracted.companyName || "";
    const roleTitle = run.roleTitle || run.result?.roleTitle || extracted.roleTitle || "";
    const displayTitle =
      companyName && roleTitle
        ? `${companyName} - ${roleTitle}`
        : companyName || roleTitle || "Saved match";

    return {
      ...run,
      _id: run._id.toString(),
      companyName,
      roleTitle,
      displayTitle,
      result: {
        ...(run.result || {}),
        companyName,
        roleTitle
      }
    };
  });
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}
