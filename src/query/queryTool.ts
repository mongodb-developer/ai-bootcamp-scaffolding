import { tool } from "@langchain/core/tools";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { Document } from "mongodb";
import { z } from "zod";
import { getChatModel } from "../llm/model";
import { getDb } from "../db/client";
import { getConfig } from "../config";
import { describeCollection } from "./schema";
import { messageContentToString, extractJsonObject } from "../util/message";

/**
 * The query leg: `structured_query`.
 *
 * Asks the model to translate a natural-language question into a single MongoDB
 * aggregation pipeline against a target collection, runs it under a result cap
 * and a query timeout, and returns the records, a plain-language explanation,
 * and the pipeline itself.
 *
 * Scope (see CLAUDE.md and context.md): this is deliberately simple. The cap and
 * timeout are DEMO ERGONOMICS, not security controls. There is intentionally no
 * validation, allowlist, role separation, or injection defense. The only
 * optional guard is a one-line $out/$merge rejection, off by default, toggled by
 * REJECT_WRITE_STAGES.
 */

type Stage = Record<string, unknown>;

const PlanSchema = z.object({
  pipeline: z.array(z.record(z.string(), z.unknown())),
  explanation: z.string().default(""),
});

function buildSystemPrompt(collection: string): string {
  return `You translate a user's question into ONE read-only MongoDB aggregation pipeline for the target collection, then explain it.

${describeCollection(collection)}

Rules:
- Output ONLY a JSON object, no prose outside it, shaped exactly:
  {"pipeline": [ <aggregation stages> ], "explanation": "<one or two plain sentences describing what the pipeline does>"}
- The pipeline must be a valid MongoDB aggregation pipeline (an array of stage objects).
- Read-only intent: use stages like $match, $group, $sort, $project, $count, $limit. Do not use $out or $merge.
- Do not include a final $limit yourself; the runtime adds a result cap.
- Prefer returning the specific fields that answer the question.`;
}

async function generatePlan(question: string, collection: string): Promise<{ pipeline: Stage[]; explanation: string }> {
  const model = getChatModel({ temperature: 0 });
  const res = await model.invoke([
    new SystemMessage(buildSystemPrompt(collection)),
    new HumanMessage(question),
  ]);
  const raw = extractJsonObject(messageContentToString(res.content));
  const plan = PlanSchema.parse(raw);
  return { pipeline: plan.pipeline as Stage[], explanation: plan.explanation };
}

export const structuredQuery = tool(
  async ({ question, collection }): Promise<string> => {
    const cfg = getConfig();
    const target = collection?.trim() || cfg.EVENTS_COLLECTION;

    const { pipeline, explanation } = await generatePlan(question, target);

    if (cfg.REJECT_WRITE_STAGES) {
      const writeStage = pipeline.find((s) => "$out" in s || "$merge" in s);
      if (writeStage) {
        return "Refused: the generated pipeline contained a write stage ($out/$merge) and REJECT_WRITE_STAGES is on.";
      }
    }

    // Trailing result cap for demo ergonomics (clamps any larger output).
    const capped: Stage[] = [...pipeline, { $limit: cfg.QUERY_RESULT_CAP }];

    const db = await getDb();
    const records = await db
      .collection(target)
      .aggregate(capped as Document[], { maxTimeMS: cfg.QUERY_MAX_TIME_MS })
      .toArray();

    return JSON.stringify(
      {
        collection: target,
        explanation,
        pipeline,
        resultCount: records.length,
        records,
      },
      null,
      2,
    );
  },
  {
    name: "structured_query",
    description:
      "Answer factual or analytical questions over structured records by generating and running a MongoDB " +
      "aggregation pipeline (counts, sums, rankings, who/when/how-much). Returns the records, a plain-language " +
      "explanation of the query, and the pipeline that ran. Defaults to the activity_events collection.",
    schema: z.object({
      question: z.string().describe("The natural-language question to answer over the structured data."),
      collection: z
        .string()
        .optional()
        .describe("Target collection name. Defaults to the configured activity_events collection."),
    }),
  },
);
