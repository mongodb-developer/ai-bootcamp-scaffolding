import type { MessageContent } from "@langchain/core/messages";
import { EJSON } from "bson";

/**
 * Provider-agnostic helpers for working with chat-model output. These touch
 * only @langchain/core types, so they are safe to use outside src/llm/model.ts.
 */

/**
 * Flatten a message's content to plain text. Bedrock (and other providers) may
 * return either a string or an array of content blocks; handle both.
 */
export function messageContentToString(content: MessageContent): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (block.type === "text" && typeof block.text === "string") return block.text;
      return "";
    })
    .join("");
}

/**
 * Parse a JSON object out of model text, tolerating ```json fences or prose
 * around the object. Throws if no JSON object can be found or parsed.
 */
export function extractJsonObject<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();

  // Fall back to the first {...} span if there is surrounding prose.
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start !== -1 && end !== -1 && end > start ? candidate.slice(start, end + 1) : candidate;

  try {
    // EJSON, not JSON: a model writing a pipeline has no way to express a BSON
    // Date in plain JSON, and a date compared as a string silently matches
    // nothing. EJSON turns {"$date": "..."} into a real Date. Plain JSON parses
    // unchanged, so every other caller is unaffected.
    return EJSON.parse(slice) as T;
  } catch (cause) {
    throw new Error(`Could not parse JSON from model output:\n${text}`, { cause });
  }
}
