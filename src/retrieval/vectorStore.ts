import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import type { Collection } from "mongodb";
import { getDb } from "../db/client";
import { getEmbeddings } from "./embeddings";
import { getConfig } from "../config";

/**
 * MongoDBAtlasVectorSearch over the KB collection. We pass our own Voyage
 * embeddings (manual embedding mode), so the store embeds documents on insert
 * and queries on search.
 *
 * Field convention, matched by the vector index created in data/load.ts:
 *   text      -> the chunk's raw text (pageContent)
 *   embedding -> the Voyage vector
 * Chunk metadata (source, section) is stored alongside for citations.
 */

// The @langchain/mongodb package depends on mongodb@^6 and nests its own copy,
// so its expected Collection type is nominally different from our newer driver's.
// The runtime object is compatible; bridge the one boundary with a cast.
type VectorStoreArgs = ConstructorParameters<typeof MongoDBAtlasVectorSearch>[1];
type VectorStoreCollection = NonNullable<VectorStoreArgs>["collection"];

export async function getVectorStore(): Promise<MongoDBAtlasVectorSearch> {
  const cfg = getConfig();
  const db = await getDb();
  const collection = db.collection(cfg.KB_COLLECTION);

  return new MongoDBAtlasVectorSearch(getEmbeddings(), {
    collection: collection as unknown as VectorStoreCollection,
    indexName: cfg.VECTOR_INDEX_NAME,
    textKey: "text",
    embeddingKey: "embedding",
  });
}

/** The raw KB collection, for load-time operations (clearing, index creation). */
export async function getKbCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection(getConfig().KB_COLLECTION);
}
