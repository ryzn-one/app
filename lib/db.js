import { MongoClient } from "mongodb";

/**
 * Pooled Mongo client.
 *
 * Serverless functions cold-start constantly. Calling MongoClient.connect()
 * per request exhausts the Atlas connection limit within minutes under any
 * real load — this is the single most common Mongo-on-Vercel failure. Caching
 * the connect() *promise* on globalThis means concurrent invocations inside one
 * warm container share a single pool, and in-flight connects are not duplicated.
 */

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

const options = {
  maxPoolSize: 10,        // Atlas M0 caps at 500 total; stay well under across containers
  minPoolSize: 0,         // let idle containers release connections
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 8_000,
  retryWrites: true,
};

const cache = globalThis.__ryznMongo ?? (globalThis.__ryznMongo = { promise: null });

export function getClient() {
  if (!cache.promise) {
    cache.promise = new MongoClient(uri, options).connect().catch((err) => {
      cache.promise = null; // let the next invocation retry rather than caching a failure
      throw err;
    });
  }
  return cache.promise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "ryzn");
}

export const collections = {
  // Better Auth owns these four — do not write to them directly.
  user: "user",
  session: "session",
  account: "account",
  verification: "verification",
  // Ryzn domain collections.
  profiles: "profiles",
  invites: "invites",
  onboardingAnswers: "onboarding_answers",
  xpEvents: "xp_events",
};
