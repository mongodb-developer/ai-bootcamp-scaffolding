import { pickLocalized } from "../../i18n";
import * as en from "./en";
import * as es from "./es";

/**
 * Language selector for the `structured_query` generator prompt, organised the
 * same way as src/agent/prompts/. The JSON contract it demands is identical in
 * both languages; only the surrounding prose (and therefore the returned
 * `explanation`) changes.
 */

export function buildSystemPrompt(collection: string): string {
  return pickLocalized({ en, es }).buildSystemPrompt(collection);
}
