import { MongoDBStore } from "@langchain/langgraph-checkpoint-mongodb";
import type { BaseStore } from "@langchain/langgraph";
import { getMongoClient } from "../db/client";
import { getConfig } from "../config";

/**
 * Long-term memory store.
 *
 * This is the counterpart to the checkpointer. The checkpointer
 * (src/memory/checkpointer.ts) is SHORT-TERM memory: it persists the full
 * message state of a single conversation thread. This store is LONG-TERM
 * memory: durable, lightweight facts about a USER that persist across threads
 * and sessions, keyed by a hierarchical namespace `[userId, "memories"]`.
 *
 * Reference discipline (from the bootcamp examples): store record REFERENCES
 * (ids) and lightweight context (the user's team, role, preferences), never raw
 * record contents or sensitive personal data. The UserMemory shape and the
 * `remember` tool's schema are built to encourage that.
 */

export type MemoryKind = "profile" | "preference" | "reference";

export interface UserMemory {
  kind: MemoryKind;
  /** One short sentence of lightweight context. Not raw record contents. */
  summary: string;
  /** Ids of records this memory refers to (the reference discipline). */
  references: string[];
  updatedAt: string;
}

let store: MongoDBStore | null = null;

// Same mongodb 6-vs-7 type skew as the checkpointer; bridge the client type.
type StoreClient = ConstructorParameters<typeof MongoDBStore>[0]["client"];

export async function getMemoryStore(): Promise<MongoDBStore> {
  if (!store) {
    const cfg = getConfig();
    const s = new MongoDBStore({
      client: getMongoClient() as unknown as StoreClient,
      dbName: cfg.MONGODB_DB,
      collectionName: cfg.MEMORY_COLLECTION,
      ...(cfg.MEMORY_TTL_SECONDS > 0
        ? { ttl: { defaultTtl: cfg.MEMORY_TTL_SECONDS, refreshOnRead: true } }
        : {}),
    });
    await s.start(); // creates indexes (and the TTL index when configured)
    store = s;
  }
  return store;
}

export function memoryNamespace(userId: string): string[] {
  return [userId, "memories"];
}

export async function saveUserMemory(
  store: BaseStore,
  userId: string,
  key: string,
  mem: Omit<UserMemory, "updatedAt">,
): Promise<void> {
  const value: UserMemory = { ...mem, updatedAt: new Date().toISOString() };
  await store.put(memoryNamespace(userId), key, value);
}

export async function listUserMemories(store: BaseStore, userId: string): Promise<UserMemory[]> {
  const items = await store.search(memoryNamespace(userId), { limit: 50 });
  return items.map((i) => i.value as UserMemory);
}

/** Render a user's memories as a short block for the system prompt. */
export function formatUserMemories(mems: UserMemory[]): string {
  if (mems.length === 0) return "";
  return mems
    .map((m) => `- (${m.kind}) ${m.summary}${m.references.length ? ` [refs: ${m.references.join(", ")}]` : ""}`)
    .join("\n");
}
