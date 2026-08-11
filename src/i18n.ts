import { getLanguage, type Config } from "./config";

/**
 * One tiny helper shared by every localised prompt site.
 *
 * The scaffold has three places that build prompts: the per-pattern system
 * prompts (src/agent/prompts/), the pipeline-generation prompt
 * (src/query/prompts/), and the hybrid judgment prompt (src/hybrid/prompts/).
 * Each is a folder of en.ts / es.ts / index.ts, and each index.ts calls
 * pickLocalized() so there is exactly one way language selection happens.
 *
 * Translate prose only. Identifiers, JSON keys ("pipeline", "explanation",
 * "subjectId", "question", "citations", "judgment"), MongoDB stage names, and
 * the verdict tokens CONSISTENT / INCONSISTENT / NEEDS REVIEW stay English in
 * every language; scripts/verify.ts matches on them.
 */

export type Language = Config["AGENT_LANGUAGE"];

/**
 * Pick the entry for the configured AGENT_LANGUAGE from a per-language map.
 *
 * Uses getLanguage() rather than getConfig(): each prompt index.ts calls this at
 * module scope, which runs before the credential bootstrap has minted the AWS
 * and Voyage keys, and full config validation would fail there.
 */
export function pickLocalized<T>(sets: Record<Language, T>): T {
  return sets[getLanguage()];
}
