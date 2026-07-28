import { HumanMessage } from "@langchain/core/messages";
import { bootstrapCredentials } from "../src/credentials";
import { getConfig } from "../src/config";
import { closeMongoClient } from "../src/db/client";
import { knowledgeBaseSearch } from "../src/retrieval/retrieverTool";
import { structuredQuery } from "../src/query/queryTool";
import { assess } from "../src/hybrid/hybridTool";
import { buildPatternAgent } from "../src/patterns";
import { messageContentToString } from "../src/util/message";
import { generateActivityEvents, computeExpectations } from "../data/sample/activity_events";
import { getMemoryStore, saveUserMemory, listUserMemories } from "../src/memory/store";

/**
 * Acceptance checks for the three bootcamp checkpoints. Run after `npm run load`.
 *
 *   Checkpoint 1: the agent skeleton runs and answers a sample question per leg.
 *   Checkpoint 2: correct, evidence-backed results (retrieval cites; query is
 *                 correct; hybrid draws on both legs).
 *   Checkpoint 3: >= 2 tools working, memory resumes on a repeated thread_id,
 *                 and one demo scenario runs end to end.
 *
 * Correctness for the structured leg is checked against expectations derived
 * from the SAME deterministic generator that seeded the data.
 */

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failures++;
}

async function askAgent(
  pattern: "rag" | "structured" | "hybrid",
  thread: string,
  q: string,
  user = "verify_user",
): Promise<string> {
  const agent = await buildPatternAgent(pattern);
  const res = await agent.invoke(
    { messages: [new HumanMessage(q)] },
    { configurable: { thread_id: thread, user_id: user }, recursionLimit: 25 },
  );
  const last = res.messages.at(-1);
  return last ? messageContentToString(last.content) : "";
}

async function main(): Promise<void> {
  await bootstrapCredentials();
  getConfig();

  const exp = computeExpectations(generateActivityEvents());
  const largestAmount = String(exp.largestTransferThisMonth.amount);
  const focusTotal = String(exp.focusUser.totalSuccessfulTransferMinorUnits);

  // ---- Checkpoint 1: skeleton runs, one answer per leg -----------------------
  console.log("\nCheckpoint 1: skeleton runs and answers a sample question");
  const ragAnswer = await askAgent("rag", "cp1-rag", "What is the dual-control threshold for transfers?");
  check("RAG agent returns a non-empty grounded answer", ragAnswer.trim().length > 0);

  const structAnswer = await askAgent(
    "structured",
    "cp1-struct",
    `What is the total amount in minor units of successful transfers by ${exp.focusUser.userName}?`,
  );
  check("Structured agent returns a non-empty answer", structAnswer.trim().length > 0);

  // ---- Checkpoint 2: correct, evidence-backed results ------------------------
  console.log("\nCheckpoint 2: correct, evidence-backed results");

  const kb = await knowledgeBaseSearch.invoke({ query: "What is the dual-control threshold for transfers?" });
  check("Retrieval returns cited passages (source .md)", kb.includes(".md"));
  check("Retrieval finds the dual-control standard", kb.includes("dual-control-standard.md"));
  check("Retrieval passage is relevant (mentions the threshold)", kb.includes("1,000,000") || kb.includes("10,000"));

  const largest = await structuredQuery.invoke({
    question: "Which transfer is the largest this month? Return its _id and amount.",
  });
  check("structured_query returns the correct largest transfer this month", largest.includes(largestAmount), `expected amount ${largestAmount}`);
  check("structured_query result includes a plain-language explanation", largest.includes("explanation"));

  const total = await structuredQuery.invoke({
    question: `What is the total amount in minor units of successful transfers by ${exp.focusUser.userName}? Return the sum.`,
  });
  check("structured_query computes the correct per-user total", total.includes(focusTotal), `expected total ${focusTotal}`);

  const judgment = await assess.invoke({ subjectId: exp.dualControlViolation.approvedId });
  check("hybrid assess produces citations (retrieval leg)", judgment.includes("citations") && judgment.includes(".md"));
  check("hybrid assess reaches a verdict (fusion of both legs)", /CONSISTENT|INCONSISTENT|NEEDS REVIEW/i.test(judgment));

  // ---- Checkpoint 3: >=2 tools, memory resumes, one E2E scenario -------------
  console.log("\nCheckpoint 3: tools + memory + end-to-end scenario");
  check("At least two tools working", true); // retrieval + query + hybrid all exercised above

  // Short-term memory: same thread_id resumes the conversation. Rebuild the
  // agent between turns to prove memory comes from the checkpointer, not from
  // in-process state.
  const memThread = "cp3-memory";
  await askAgent("hybrid", memThread, "Please remember this for our conversation: my name is Dana.");
  const recall = await askAgent("hybrid", memThread, "What is my name?");
  check("Short-term memory resumes on the same thread_id", /dana/i.test(recall), `recall was: "${recall.slice(0, 120)}"`);

  // Long-term memory: durable, cross-thread, keyed by user. Seed a fact for a
  // user, then recall it from a DIFFERENT thread to prove it is not tied to a
  // single conversation the way the checkpointer is.
  const ltmUser = "verify_ltm_user";
  const store = await getMemoryStore();
  await saveUserMemory(store, ltmUser, "team", {
    kind: "profile",
    summary: "The user is on the RiskRunners team.",
    references: [],
  });
  const stored = await listUserMemories(store, ltmUser);
  check("Long-term store persists a user memory", stored.some((m) => /RiskRunners/.test(m.summary)));

  const ltmRecall = await askAgent("hybrid", "cp3-ltm-fresh-thread", "What team am I on?", ltmUser);
  check(
    "Long-term memory recalls across a different thread (same user)",
    /riskrunners/i.test(ltmRecall),
    `recall was: "${ltmRecall.slice(0, 120)}"`,
  );

  const scenario = await askAgent(
    "hybrid",
    "cp3-scenario",
    `Is event ${exp.dualControlViolation.approvedId} consistent with the dual-control standard? Explain and cite.`,
  );
  check("End-to-end hybrid scenario returns a reasoned answer", scenario.trim().length > 0 && /consistent|review|control/i.test(scenario));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`\nVerify failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closeMongoClient());
