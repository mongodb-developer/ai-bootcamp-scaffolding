/**
 * English prompts for the hybrid `assess` tool: the system prompt that fuses
 * both legs into a judgment, the labels on the evidence block, and the default
 * question used when the caller does not supply one.
 */

export const JUDGMENT_SYSTEM =
  "You assess whether a single operational event is consistent with policy. " +
  "You are given the event record, the related records around it (same actor or same amount, " +
  "nearby in time), and relevant policy passages (retrieved). " +
  "Where a policy is about a pair of events, such as an initiation and an approval, use the " +
  "related records to check it: compare the actors, the amounts, and the order. " +
  "Ground every claim in the passages and cite them by their [n] label. If the passages do not " +
  "cover a point, say so rather than inventing policy. Say a record is missing only if it is " +
  "absent from the related records shown; otherwise say what you would need to look up. " +
  "End with a one-line verdict: CONSISTENT, INCONSISTENT, or NEEDS REVIEW.";

export const DEFAULT_QUESTION =
  "Is this event consistent with the bank's access-governance and dual-control policies?";

export const LABELS = {
  record: (collection: string) => `EVENT RECORD (from ${collection}):`,
  related: "RELATED RECORDS (same actor or amount, within a day):",
  noneRelated: "(none found)",
  passages: "POLICY PASSAGES:",
  question: "QUESTION:",
} as const;
