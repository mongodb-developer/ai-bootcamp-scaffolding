/**
 * Plain-language descriptions of the structured collections, fed to the model
 * so it generates better MongoDB pipelines. This is a PROMPT AID, not a gate:
 * it improves query quality; it does not validate or restrict anything.
 *
 * The enums here are the single source of truth, imported by the synthetic data
 * generator so the data and the description never drift.
 *
 * BILINGUAL NOTE: this description stays in English in every language, on
 * purpose, not by oversight. It is almost entirely field names, enum values, and
 * pipeline guidance; models read it fine cross-lingually, and translating it
 * would risk drifting against the generator that imports these enums. Only the
 * surrounding prompt prose in src/query/prompts/ is localised, which is enough
 * to get a Spanish `explanation` back.
 */

export const ACTION_TYPES = [
  "LOGIN",
  "BALANCE_QUERY",
  "TRANSFER_INITIATED",
  "TRANSFER_APPROVED",
  "USER_CREATED",
  "USER_MODIFIED",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const CHANNELS = ["WEB", "MOBILE", "API", "BRANCH"] as const;
export type Channel = (typeof CHANNELS)[number];

export const STATUSES = ["SUCCESS", "FAILED", "PENDING"] as const;
export type Status = (typeof STATUSES)[number];

/** Monetary actions carry a non-zero `amount` (in minor units); others are 0. */
export const MONETARY_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>([
  "TRANSFER_INITIATED",
  "TRANSFER_APPROVED",
]);

const ACTIVITY_EVENTS_DESCRIPTION = `Collection: activity_events
One document per operational event at the bank. Fields:
  _id        string   stable id like "evt_0001"
  userId     string   actor id like "user_03"
  userName   string   actor display name, e.g. "Priya Nair"
  action     string   one of: ${ACTION_TYPES.join(", ")}
  amount     number   money moved in MINOR UNITS (cents). Non-zero only for
                      ${[...MONETARY_ACTIONS].join(" and ")}; 0 otherwise.
                      Example: amount 1500000 means 15,000.00 in currency units.
  channel    string   one of: ${CHANNELS.join(", ")}
  status     string   one of: ${STATUSES.join(", ")}
  timestamp  Date     BSON date when the event occurred (UTC)

Guidance for pipelines:
  - "how much did user X move" => sum amount for that user, usually filtered to
    transfer actions and/or status SUCCESS.
  - "largest transfer this month" => filter action in the transfer actions and
    timestamp within the current calendar month, sort amount descending.
  - Amounts are integers in minor units; divide by 100 for display only, not in
    the pipeline unless asked.
  - timestamp is a real BSON Date. A plain string never matches a Date, so write
    dates as Extended JSON: {"timestamp": {"$gte": {"$date": "2026-08-01T00:00:00Z"}}}
    For windows relative to now, prefer $$NOW so the query stays correct later:
    {"$match": {"$expr": {"$gte": ["$timestamp", {"$dateTrunc": {"date": "$$NOW", "unit": "month"}}]}}}
  - Never assume the data is empty because a date filter returned nothing. Check
    the filter's types first.`;

/**
 * Return a plain-language description of the target collection for the query
 * prompt. Unknown collections get a generic note so teams can point the tool at
 * their own data without editing this file first.
 */
export function describeCollection(name: string): string {
  if (name === "activity_events") return ACTIVITY_EVENTS_DESCRIPTION;
  return `Collection: ${name}\n(No schema description registered. Infer fields and types from the question; prefer a conservative read-only pipeline.)`;
}
