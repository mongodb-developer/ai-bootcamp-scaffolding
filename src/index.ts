import { parseArgs } from "node:util";
import { HumanMessage } from "@langchain/core/messages";
import { bootstrapCredentials } from "./credentials";
import { getConfig } from "./config";
import { buildPatternAgent, isPattern, PATTERNS } from "./patterns";
import { closeMongoClient } from "./db/client";
import { messageContentToString } from "./util/message";

/**
 * CLI demo:
 *   npm run dev -- --pattern <rag|structured|hybrid> --thread <id> --user <id> "your question"
 *
 * Re-run with the same --thread to see short-term (per-conversation) memory
 * resume. Re-run with the same --user but a NEW --thread to see long-term
 * (cross-thread) memory carry over.
 */
async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      pattern: { type: "string", default: "hybrid" },
      thread: { type: "string", default: "demo" },
      user: { type: "string", default: "user_demo" },
    },
  });

  const question = positionals.join(" ").trim();
  const pattern = values.pattern ?? "hybrid";
  const threadId = values.thread ?? "demo";
  const userId = values.user ?? "user_demo";

  if (!question) {
    throw new Error(
      `No question provided.\nUsage: npm run dev -- --pattern <${PATTERNS.join("|")}> --thread <id> --user <id> "your question"`,
    );
  }
  if (!isPattern(pattern)) {
    throw new Error(`Unknown pattern "${pattern}". Choose one of: ${PATTERNS.join(", ")}.`);
  }

  // Mint credentials into memory, then validate config once.
  await bootstrapCredentials();
  getConfig();

  const agent = await buildPatternAgent(pattern);
  const result = await agent.invoke(
    { messages: [new HumanMessage(question)] },
    { configurable: { thread_id: threadId, user_id: userId }, recursionLimit: 25 },
  );

  const last = result.messages.at(-1);
  console.log(`\n[pattern=${pattern} thread=${threadId} user=${userId}]\n`);
  console.log(last ? messageContentToString(last.content) : "(no answer produced)");
}

main()
  .catch((err) => {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closeMongoClient());
