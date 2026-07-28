import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { getMongoClient } from "../db/client";
import { getConfig } from "../config";

/**
 * MongoDB-backed checkpointer. This is what gives the agent memory: state is
 * persisted per conversation thread (keyed by `thread_id` in the invoke config)
 * so re-running with the same thread resumes the conversation, even across
 * separate process runs.
 *
 * .setup() creates the compound indexes the saver needs and is safe to call
 * repeatedly, so we call it once when the saver is first requested.
 */

let saver: MongoDBSaver | null = null;

/**
 * The checkpointer package depends on mongodb@^6 and carries its own nested
 * copy, while this app uses the newest driver (7.x). The runtime objects are
 * compatible for the methods the saver calls; only the nominal TS types differ,
 * so we bridge that one boundary with a cast to the exact type the constructor
 * expects. Remove this once the LangChain packages track the same major.
 */
type SaverClient = ConstructorParameters<typeof MongoDBSaver>[0]["client"];

export async function getCheckpointer(): Promise<MongoDBSaver> {
  if (!saver) {
    const s = new MongoDBSaver({
      client: getMongoClient() as unknown as SaverClient,
      dbName: getConfig().MONGODB_DB,
    });
    await s.setup();
    saver = s;
  }
  return saver;
}
