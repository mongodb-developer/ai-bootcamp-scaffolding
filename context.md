# Architecture and Design

How the scaffold is wired and why, for teams extending it and for Claude Code working in the repo. For the day's workflow see `HOW-TO-USE.md`; for setup and environment variables see `README.md`; for the rules that bind changes see `CLAUDE.md`. The original build specification is preserved in `.assets/` if you need it.

## What this repo is

A reference scaffold for a one-day, hands-on bootcamp where teams of three to five build one enterprise AI agent on MongoDB Atlas using LangGraph. Teams do not start from zero. They point this scaffold at their own data, write two or three business-specific tools on top of the examples, and tune retrieval, queries, prompts, and memory for their scenario. The scaffold is what lets a team reach a working agent in four to five hours.

The audience is enterprise developers, many from a relational background, guided by Claude Code inside browser-based Instruqt environments. These are proof-of-concept agents early in the productization journey. Clarity and speed to a working demo matter more than production hardening, which the adopting organization handles downstream.

## The three agent patterns

Every team's agent is one of these, and the scaffold supports all three out of the box.

**Document-retrieval (RAG).** Answers from an unstructured document knowledge base using Atlas Vector Search with Voyage embeddings and reranking, and cites sources. For questions whose answers live in text: policies, runbooks, SOPs.

**Structured-query.** Answers by generating and running read-only MongoDB queries and aggregations over structured collections. For factual and analytical questions over records: who did what, when, how much, counts, rankings, summaries. Structured data at the event is synthetic.

**Hybrid.** Combines both in one answer: retrieve text context and query structured records, then reason over both. This is the pattern MongoDB is uniquely built for as a single data layer, and the one strong teams are nudged toward. The included hybrid example is the flagship.

`src/patterns.ts` selects the tools and system prompt for each pattern; `src/agent/prompts/` holds the per-pattern prompts, one file per language.

## Bilingual prompts

The scaffold ships English and Spanish. `AGENT_LANGUAGE` (`en` | `es`, validated in `src/config.ts`) selects the prompt set, and so the language the agent answers in. Three sites are localised, each a folder of `en.ts` / `es.ts` / `index.ts` whose `index.ts` calls `pickLocalized()` from `src/i18n.ts`: `src/agent/prompts/` (per-pattern personas), `src/query/prompts/` (the pipeline generator, which produces the `explanation`), and `src/hybrid/prompts/` (the `assess` judgment). Participant material mirrors this: `HOW-TO-USE.md` / `HOW-TO-USE.es.md` and `prompts/en/` / `prompts/es/`.

Only prose is translated. Identifiers, JSON keys, MongoDB stage names, the enums and collection description in `src/query/schema.ts`, and the verdict tokens `CONSISTENT` / `INCONSISTENT` / `NEEDS REVIEW` stay English in every language, because code and `scripts/verify.ts` match on them literally.

## Architecture and the LangGraph runtime

The agent is a tool-calling graph (`src/agent/graph.ts`): a chat model node that can call any registered tool, looping until it produces a final answer.

Nodes and edges:

- A model node that receives the running message state plus the bound tools, and (when a `user_id` is present) the user's recalled long-term memory prepended to the system prompt.
- A tool node that executes whichever tool the model called and appends the result.
- A conditional edge that loops back to the model while there are tool calls, and ends when there are none.

**Memory has two layers, both backed by MongoDB and both orthogonal:**

- **Short-term** (`src/memory/checkpointer.ts`): a `MongoDBSaver` checkpointer keyed by `thread_id`, so re-running with the same thread resumes that conversation, even across process runs.
- **Long-term** (`src/memory/store.ts`): a `MongoDBStore` keyed by the namespace `[userId, "memories"]`, so durable facts about a user persist across threads. The graph reads it automatically each turn; the `remember` tool writes to it.

Long-term memory follows the reference discipline: store record references and lightweight context (the user's team, role, ids of interest), not raw record contents.

## The example tools

Each is a working reference teams copy from. Tools register in `src/tools/registry.ts` and join a pattern in `src/patterns.ts`.

**`knowledge_base_search` (retrieval leg).** Wraps `MongoDBAtlasVectorSearch` over a Voyage-embedded KB collection, retrieves top-k by vector similarity, reranks with Voyage, and returns passages with source and section citations. Teams repoint it at their own KB.

**`structured_query` (query leg).** Given a natural-language question and a target collection, it asks the model to produce a MongoDB aggregation pipeline, runs it under a default result cap and a query timeout, and returns the records, a plain-language explanation of the query it ran, and the pipeline itself. See "Query tool scope" below.

**`assess` (hybrid example).** Demonstrates fusion: given a subject (for example a structured record id), it queries the collection for the record and retrieves the relevant text passages, then hands both to the model to produce a grounded, cited judgment. This shows how one answer can draw on both legs.

**`remember` (memory).** Writes a lightweight, durable fact about the current user to long-term memory. Available in every pattern, since memory is cross-cutting.

## Query tool scope (read-oriented, light caps, hardening out of scope)

These agents are proof-of-concept. Query-tool security is out of scope for the bootcamp and is the adopting organization's responsibility during productization. The scaffold keeps the query tool simple:

- The model is prompted to produce a read-only aggregation pipeline for the question against the target collection.
- Execution applies a default result cap (a trailing `$limit`, clamping any larger provided limit) and a `maxTimeMS` timeout. These exist for demo ergonomics, so a query does not return thousands of rows or hang during a presentation. They are not a security control.
- The tool returns the records, a plain-language explanation of the query it ran, and the pipeline. The explanation is a pedagogy and transparency feature.

There is deliberately no validation, allowlist, role-separation, or injection-defense layer. If a team wants to protect its own synthetic data from an accidental overwrite, rejecting `$out` and `$merge` is a one-line optional guard (`REJECT_WRITE_STAGES`), off by default and not part of the reference posture.

## How the chat model is reached

The runtime chat model is reached through one module, `src/llm/model.ts`, exporting:

```ts
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
export function getChatModel(opts?: { temperature?: number }): BaseChatModel;
```

No module other than `src/llm/model.ts` imports a model-provider or gateway SDK. Embeddings and reranking are separate and are always Voyage, wired in `src/retrieval`.

As built:

- **Provider:** AWS Bedrock (Anthropic Claude), via `ChatBedrockConverse` from `@langchain/aws`. The model talks only to the Bedrock runtime over SigV4.
- **Credentials:** per-session AWS keys and the Voyage key are minted at startup by `src/credentials.ts` from the DevDay credentials Lambda's `get_token` task, into `process.env` in memory only, never written to disk. The Lambda's `completion` task is never used. See `.assets/LAMBDA_USAGE.md`.
- **Config (env):** `PASSKEY` and `LAMBDA_CREDENTIALS_URL` drive the credential bootstrap; `BEDROCK_REGION` (default `us-west-2`) and `BEDROCK_MODEL_ID` (default `global.anthropic.claude-sonnet-4-6`) configure the model; `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `VOYAGE_API_KEY` are the minted values. All are read and validated in `src/config.ts`.
- **Defaults:** temperature 0 (overridable via `getChatModel({ temperature })`), max tokens around 4096. Passkeys roll on a ~3-day window; a `401` from the Lambda means "get a fresh passkey." If Bedrock invocation fails on region or model, try `BEDROCK_REGION=us-east-1`, since the global inference profile routes cross-region.

## The sample data model

The scaffold ships a synthetic sample scenario so it runs out of the box and as a reference to copy. It is neutral and bank-flavored, fully synthetic, and self-consistent so its verifiable answers are actually correct. **Teams replace this with their own data;** carry over the conventions and the internal-consistency discipline, not the specific collections.

**`kb_documents`** (knowledge base): short markdown policy and runbook documents (an access-governance policy, a dual-control standard, an incident runbook), chunked, each chunk embedded with Voyage and stored with `source` and `section` for citation. An Atlas Vector Search index named `vector_index` over the embedding field, with dimensions matching the Voyage model.

**`activity_events`** (structured): synthetic operational events with `_id`, `userId`, `userName`, `action` (one of `LOGIN`, `BALANCE_QUERY`, `TRANSFER_INITIATED`, `TRANSFER_APPROVED`, `USER_CREATED`, `USER_MODIFIED`), `amount` (number, currency minor units), `channel`, `status`, `timestamp` (BSON date). The generator (`data/sample/activity_events.ts`) is deterministic and asserts its own consistency: the record named as "largest transfer this month" really is the largest, per-user totals sum correctly, and a dual-control violation is seeded for the hybrid demo. Indexes on `userId`, `action`, `timestamp`.

The sample exercises all three patterns: RAG over `kb_documents`, structured-query over `activity_events` ("how much did user U move", "who made the largest transfer this month"), and hybrid ("is this event consistent with the dual-control standard") over both.

## The bootcamp checkpoints

`npm run verify` checks these against the team's data. `scripts/verify.ts` is the reference implementation; teams adapt its expected values to their own known-correct answers.

- **Checkpoint 1:** the skeleton runs and answers one sample question. RAG returns a grounded KB answer; structured returns a correct number from the collection; hybrid gets either leg working end to end.
- **Checkpoint 2:** correct, evidence-backed results. Retrieval returns reranked, relevant, cited passages; `structured_query` returns the correct records with its plain-language explanation; hybrid shows both legs contributing.
- **Checkpoint 3:** at least two tools working, memory persisting across sessions (same `thread_id` resumes; same `user_id` recalls across threads), and one demo scenario running end to end.

## Non-goals

No customer PII, no real transaction data, no production data of any kind. The agent is read-oriented against the data and does not write to the analyzed collections, but query-security hardening (validation, roles, injection defense) is out of scope and is the adopting organization's responsibility. No provider SDK imported outside `src/llm/model.ts`. No local model hosting. No web UI; a CLI demo and a verify script are enough for the bootcamp.
