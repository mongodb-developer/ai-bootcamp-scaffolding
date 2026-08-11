import { pickLocalized } from "../../i18n";
import * as en from "./en";
import * as es from "./es";

/**
 * Language selector for the per-pattern system prompts. Consumers import
 * RAG_PROMPT / STRUCTURED_PROMPT / HYBRID_PROMPT from here exactly as they did
 * from the old single-file src/agent/prompts.ts; only the source of the strings
 * changed. Edit en.ts or es.ts to tune your agent's persona.
 */

/** The shape every language file must provide. Widens the literal string types
 *  so "en" and "es" are interchangeable to the type checker. */
type PromptSet = {
  RAG_PROMPT: string;
  STRUCTURED_PROMPT: string;
  HYBRID_PROMPT: string;
};

const set = pickLocalized<PromptSet>({ en, es });

export const RAG_PROMPT = set.RAG_PROMPT;
export const STRUCTURED_PROMPT = set.STRUCTURED_PROMPT;
export const HYBRID_PROMPT = set.HYBRID_PROMPT;
