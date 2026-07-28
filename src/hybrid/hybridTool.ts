import { tool } from "@langchain/core/tools";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import { getChatModel } from "../llm/model";
import { getDb } from "../db/client";
import { getConfig } from "../config";
import { retrievePassages, formatPassages } from "../retrieval/retrieverTool";
import { messageContentToString } from "../util/message";

/**
 * The hybrid example: `assess`.
 *
 * The flagship pattern. Given the id of a structured record, it does both legs
 * in one tool: query the structured collection for the record, retrieve the
 * relevant policy passages, then hand both to the model for a grounded, cited
 * judgment. This is the "single data layer" story: one answer drawing on
 * structured records and unstructured policy together.
 */

export const assess = tool(
  async ({ subjectId, question }): Promise<string> => {
    const cfg = getConfig();
    const db = await getDb();

    // Leg 1: structured lookup. Our synthetic _id values are strings ("evt_0001").
    const record = await db
      .collection(cfg.EVENTS_COLLECTION)
      .findOne({ _id: subjectId } as unknown as Filter<Document>);

    if (!record) {
      return `No record found in ${cfg.EVENTS_COLLECTION} with _id "${subjectId}".`;
    }

    const focus =
      question?.trim() ||
      "Is this event consistent with the bank's access-governance and dual-control policies?";

    // Leg 2: retrieval. Seed the query with the record's salient fields so the
    // most relevant policy passages surface.
    const retrievalQuery = `${focus} action=${String(record.action)} amount=${String(record.amount)} channel=${String(record.channel)} status=${String(record.status)}`;
    const passages = await retrievePassages(retrievalQuery);

    // Fusion: reason over both, cite the passages.
    const model = getChatModel({ temperature: 0 });
    const system = new SystemMessage(
      "You assess whether a single operational event is consistent with policy. " +
        "You are given the event record (structured) and relevant policy passages (retrieved). " +
        "Ground every claim in the passages and cite them by their [n] label. If the passages do not " +
        "cover a point, say so rather than inventing policy. End with a one-line verdict: " +
        "CONSISTENT, INCONSISTENT, or NEEDS REVIEW.",
    );
    const human = new HumanMessage(
      `EVENT RECORD (from ${cfg.EVENTS_COLLECTION}):\n${JSON.stringify(record, null, 2)}\n\n` +
        `POLICY PASSAGES:\n${formatPassages(passages)}\n\n` +
        `QUESTION: ${focus}`,
    );
    const res = await model.invoke([system, human]);
    const judgment = messageContentToString(res.content);

    return JSON.stringify(
      {
        subjectId,
        question: focus,
        citations: passages.map((p, i) => ({ ref: i + 1, source: p.source, section: p.section })),
        judgment,
      },
      null,
      2,
    );
  },
  {
    name: "assess",
    description:
      "Assess a specific structured record against policy by fusing both legs: look up the record and retrieve " +
      "the relevant policy passages, then produce a grounded, cited judgment. Use for questions like 'is event " +
      "evt_0007 consistent with the dual-control policy?'. Takes the record's _id.",
    schema: z.object({
      subjectId: z.string().describe("The _id of the record to assess, e.g. 'evt_0007'."),
      question: z
        .string()
        .optional()
        .describe("Optional specific question. Defaults to policy-consistency of the event."),
    }),
  },
);
