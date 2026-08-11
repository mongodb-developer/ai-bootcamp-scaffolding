import { pickLocalized } from "../../i18n";
import * as en from "./en";
import * as es from "./es";

/**
 * Language selector for the hybrid `assess` prompts, organised the same way as
 * src/agent/prompts/ and src/query/prompts/. The JSON keys the tool returns
 * (subjectId, question, citations, judgment) and the three verdict tokens are
 * language-independent; only the prose changes.
 */

/** The shape every language file must provide. Widens the literal string types
 *  so "en" and "es" are interchangeable to the type checker. */
type AssessPromptSet = {
  JUDGMENT_SYSTEM: string;
  DEFAULT_QUESTION: string;
  LABELS: {
    record: (collection: string) => string;
    related: string;
    noneRelated: string;
    passages: string;
    question: string;
  };
};

const set = pickLocalized<AssessPromptSet>({ en, es });

export const JUDGMENT_SYSTEM = set.JUDGMENT_SYSTEM;
export const DEFAULT_QUESTION = set.DEFAULT_QUESTION;
export const LABELS = set.LABELS;
