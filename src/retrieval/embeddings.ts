import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { getConfig } from "../config";

/**
 * Voyage AI embeddings, exposed as a LangChain Embeddings so it plugs directly
 * into MongoDBAtlasVectorSearch. Embeddings and reranking are always Voyage
 * (they are separate from the chat model). We call the Voyage REST API directly
 * with fetch to keep the dependency surface small and the behavior transparent;
 * the SDK is deliberately not used. The VOYAGE_API_KEY is minted at runtime by
 * src/credentials.ts.
 *
 * Voyage distinguishes "document" inputs (stored corpus) from "query" inputs
 * (search text); we set input_type accordingly for better retrieval quality.
 */

type VoyageInputType = "document" | "query";

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

export class VoyageEmbeddings extends Embeddings {
  private readonly model: string;
  private readonly dimensions: number;
  private readonly apiKey: string;
  private readonly apiBase: string;

  constructor(params: EmbeddingsParams = {}) {
    super(params);
    const cfg = getConfig();
    this.model = cfg.VOYAGE_EMBEDDING_MODEL;
    this.dimensions = cfg.VOYAGE_EMBEDDING_DIMENSIONS;
    this.apiKey = cfg.VOYAGE_API_KEY;
    this.apiBase = cfg.VOYAGE_API_BASE;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.embed(texts, "document");
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([text], "query");
    if (!vector) throw new Error("Voyage returned no embedding for the query.");
    return vector;
  }

  private async embed(input: string[], inputType: VoyageInputType): Promise<number[][]> {
    const res = await fetch(`${this.apiBase}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input,
        model: this.model,
        input_type: inputType,
        output_dimension: this.dimensions,
      }),
    });

    if (!res.ok) {
      throw new Error(`Voyage embeddings request failed: HTTP ${res.status} ${await res.text()}`);
    }

    const body = (await res.json()) as VoyageEmbeddingResponse;
    // Order is not guaranteed by index, so place each vector at its returned index.
    const ordered = new Array<number[]>(input.length);
    for (const item of body.data) {
      ordered[item.index] = item.embedding;
    }
    for (let i = 0; i < ordered.length; i++) {
      if (!ordered[i]) throw new Error(`Voyage embeddings response missing index ${i}.`);
    }
    return ordered as number[][];
  }
}

export function getEmbeddings(): VoyageEmbeddings {
  return new VoyageEmbeddings();
}
