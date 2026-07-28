import { MongoClient, type Db } from "mongodb";
import { getConfig } from "../config";

/**
 * A single MongoClient shared by the tools and the checkpointer. Creating one
 * client per process (with its own connection pool) is the recommended pattern;
 * do not open a client per request.
 */

let client: MongoClient | null = null;

export function getMongoClient(): MongoClient {
  if (!client) {
    client = new MongoClient(getConfig().MONGODB_URI);
  }
  return client;
}

export async function getDb(): Promise<Db> {
  const c = getMongoClient();
  await c.connect(); // idempotent once connected
  return c.db(getConfig().MONGODB_DB);
}

export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
