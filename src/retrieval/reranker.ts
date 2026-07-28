import { getConfig } from "../config";

/**
 * Voyage AI reranking, called over REST. After vector search pulls a candidate
 * set by embedding similarity, the reranker reorders those candidates by
 * relevance to the query, which sharpens the passages the agent finally cites.
 */

export interface RerankResult {
  /** Index into the original `documents` array passed in. */
  index: number;
  /** Voyage relevance score for this document against the query. */
  relevanceScore: number;
}

interface VoyageRerankResponse {
  data: Array<{ index: number; relevance_score: number }>;
}

export async function rerank(
  query: string,
  documents: string[],
  topK: number,
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];
  const cfg = getConfig();

  const res = await fetch(`${cfg.VOYAGE_API_BASE}/rerank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: cfg.VOYAGE_RERANK_MODEL,
      top_k: Math.min(topK, documents.length),
    }),
  });

  if (!res.ok) {
    throw new Error(`Voyage rerank request failed: HTTP ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as VoyageRerankResponse;
  return body.data.map((d) => ({ index: d.index, relevanceScore: d.relevance_score }));
}
