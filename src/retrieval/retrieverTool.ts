import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getVectorStore } from "./vectorStore";
import { rerank } from "./reranker";
import { getConfig } from "../config";

/**
 * The retrieval leg: `knowledge_base_search`.
 *
 * Pulls top-k candidates from Atlas Vector Search, reranks them with Voyage,
 * and returns the strongest passages with source/section citations. Teams
 * repoint this at their own KB by changing KB_COLLECTION and the vector index.
 */

export interface Passage {
  text: string;
  source: string;
  section: string;
  score: number;
}

/**
 * Shared retrieval used by both the retriever tool and the hybrid `assess`
 * tool: vector search for recall, then rerank for precision.
 */
export async function retrievePassages(query: string): Promise<Passage[]> {
  const cfg = getConfig();
  const store = await getVectorStore();

  const hits = await store.similaritySearchWithScore(query, cfg.RETRIEVAL_TOP_K);
  const docs = hits.map(([doc]) => doc);
  if (docs.length === 0) return [];

  const ranked = await rerank(
    query,
    docs.map((d) => d.pageContent),
    cfg.RERANK_TOP_K,
  );

  const passages: Passage[] = [];
  for (const r of ranked) {
    const doc = docs[r.index];
    if (!doc) continue;
    passages.push({
      text: doc.pageContent,
      source: String(doc.metadata.source ?? "unknown"),
      section: String(doc.metadata.section ?? ""),
      score: r.relevanceScore,
    });
  }
  return passages;
}

/** Render passages as a compact, citation-first block for the model to ground on. */
export function formatPassages(passages: Passage[]): string {
  if (passages.length === 0) return "No relevant passages found in the knowledge base.";
  return passages
    .map((p, i) => {
      const cite = p.section ? `${p.source} > ${p.section}` : p.source;
      return `[${i + 1}] ${cite} (relevance ${p.score.toFixed(3)})\n${p.text}`;
    })
    .join("\n\n");
}

export const knowledgeBaseSearch = tool(
  async ({ query }): Promise<string> => {
    const passages = await retrievePassages(query);
    return formatPassages(passages);
  },
  {
    name: "knowledge_base_search",
    description:
      "Search the policy and runbook knowledge base for passages relevant to a question. " +
      "Use this for questions whose answers live in text: policies, standards, runbooks, SOPs. " +
      "Returns the most relevant passages with source and section citations.",
    schema: z.object({
      query: z
        .string()
        .describe("A natural-language question or topic to search the knowledge base for."),
    }),
  },
);
