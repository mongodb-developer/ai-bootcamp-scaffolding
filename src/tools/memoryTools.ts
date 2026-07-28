import { tool } from "@langchain/core/tools";
import { getStore, getConfig } from "@langchain/langgraph";
import { z } from "zod";
import { saveUserMemory } from "../memory/store";

/**
 * The `remember` tool: write to long-term, cross-thread memory.
 *
 * The read side is automatic (the graph injects known user context into the
 * system prompt each turn), so this tool only handles the write side: it lets
 * the agent persist a lightweight, durable fact about the user. It reads the
 * active store and the current user_id from the LangGraph run context.
 *
 * Reference discipline: the schema pushes toward short summaries and record
 * ids, not raw record contents. See src/memory/store.ts.
 */
export const remember = tool(
  async ({ key, kind, summary, references }): Promise<string> => {
    const store = getStore();
    const userId = getConfig().configurable?.user_id as string | undefined;
    if (!store) return "Long-term memory store is not available in this context.";
    if (!userId) return "No user_id in the run context; cannot persist user memory.";

    await saveUserMemory(store, userId, key, { kind, summary, references: references ?? [] });
    return `Remembered "${key}" for this user.`;
  },
  {
    name: "remember",
    description:
      "Persist a SHORT, durable fact or reference about the current user across sessions (their team, role, " +
      "preferences, or ids of records they care about). Use it when the user states something worth recalling " +
      "in future conversations. Do NOT store raw record contents or sensitive personal data; store references " +
      "(ids) and brief context only.",
    schema: z.object({
      key: z.string().describe("A short stable key for this memory, e.g. 'team' or 'watched_cases'."),
      kind: z
        .enum(["profile", "preference", "reference"])
        .describe("profile = who the user is; preference = how they like to work; reference = ids they care about."),
      summary: z.string().describe("One short sentence of lightweight context. No raw record contents."),
      references: z
        .array(z.string())
        .optional()
        .describe("Optional list of record ids this memory refers to."),
    }),
  },
);
