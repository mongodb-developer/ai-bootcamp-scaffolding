# BuildRel Bootcamp Scaffold

A working starting point for the AI Agent Development Bootcamp. Using your own data (or generating mock data from your schema and samples), add your own tools to build a functioning enterprise AI agent on MongoDB as the single data layer for retrieval, structured queries, and agent memory.

Out of the box it gives you:

- **A tool-calling agent** (LangGraph): a chat model that loops over registered tools until it has an answer, with a conditional tool loop and a clean place to add your own tools.
- **Three patterns to choose from**: document-retrieval (RAG), structured-query, and hybrid.
- **Retrieval leg** (`knowledge_base_search`): Atlas Vector Search with Voyage embeddings and reranking, returning passages with source citations.
- **Query leg** (`structured_query`): turns a natural-language question into a read-only MongoDB aggregation, runs it, and explains what it ran.
- **Hybrid fusion** (`assess`): one grounded, cited answer over retrieved text and structured records together.
- **Memory**: short-term per conversation (a MongoDB checkpointer) and long-term per user (a MongoDB store), with a `remember` tool.
- **A tool registry** to plug in your own two to three business tools, plus a CLI demo and a `verify` script.

You bring the data and the use case. The scaffold also ships a small synthetic sample scenario (bank operations) and example tools: a runnable reference to copy from, and a fallback if your team wants something to build against before your own data is ready. That sample is not the goal of the repo. One habit worth carrying over from it: keep synthetic data internally consistent so your agent's answers stay verifiable.

These are proof-of-concept agents. Clarity and speed to a working demo are the priorities; production hardening (including query security) is out of scope and handled downstream. See `context.md` for the full architecture and `CLAUDE.md` for the invariants.

## The three patterns

Pick the one that matches your use case; your data and tools follow from it.

- **Document-retrieval (RAG)** with `knowledge_base_search`: Atlas Vector Search over a Voyage-embedded knowledge base, reranked with Voyage, answers cited. For questions whose answers live in text.
- **Structured-query** with `structured_query`: turns a question into a read-only MongoDB aggregation over your structured collection, runs it under a result cap and timeout, and returns the records plus a plain-language explanation. For factual and analytical questions over records.
- **Hybrid** with `assess` (the flagship): looks up a structured record and retrieves the relevant text, then fuses both into one grounded, cited judgment. The pattern MongoDB is uniquely built for as a single data layer.

## Architecture

A tool-calling LangGraph: a model node that can call any registered tool, looping until it produces a final answer, with a `MongoDBSaver` checkpointer persisting state per `thread_id`.

```
START -> model -> (tool calls?) --yes--> tools -> model -> ...
                               --no---> END
```

```
src/
  index.ts                 CLI demo
  config.ts                env loading + zod validation (single source of config)
  credentials.ts           mints AWS + Voyage keys from the Lambda into memory
  llm/model.ts             getChatModel(): the ONLY provider SDK import
  db/client.ts             shared Mongo client singleton
  memory/checkpointer.ts   MongoDBSaver (short-term, per thread_id)
  memory/store.ts          MongoDBStore (long-term, per user, reference discipline)
  retrieval/               Voyage embeddings + reranker, vector store, retriever tool
  query/                   collection schema aid + structured_query tool
  hybrid/hybridTool.ts     assess (fusion)
  tools/registry.ts        register your tools here (+ exampleBusinessTool.ts)
  tools/memoryTools.ts     remember (writes long-term memory)
  agent/prompts/           per-pattern system prompts, en.ts / es.ts / index.ts
  agent/graph.ts           the LangGraph graph
  i18n.ts                  pickLocalized(): one way to select the language set
  patterns.ts              selects tools + prompt per pattern
data/
  sample/kb/               synthetic policy/runbook markdown
  sample/activity_events.ts  deterministic, self-asserting event generator
  mock-input/              fill-in schema + samples; a prompt expands them into the generator
  load.ts                  chunk + embed + index the KB; insert events; ensure indexes
scripts/verify.ts          the three-checkpoint acceptance checks
```

## Setup

Requires Node 20+ and MongoDB with Vector Search: an Atlas cluster, or a local deployment like the one the bootcamp workspace provides.

```bash
npm install
mv env.example .env.example   # see note below
cp .env.example .env          # then fill in MONGODB_URI and set PASSKEY
```

> Note: the environment template ships as `env.example`. It should be named `.env.example`; the repo tooling that generated it blocked writing `.env*` dotfiles, hence the rename step. The name is the only difference.

Then:

```bash
npm run typecheck   # clean
npm run load        # seed KB + events, build the vector index (waits for it)
npm run verify      # run the three checkpoints
```

Run the CLI demo against the shipped sample data:

```bash
npm run dev -- --pattern rag        --thread demo --user analyst_1 "What is the dual-control threshold?"
npm run dev -- --pattern structured --thread demo --user analyst_1 "Who made the largest transfer this month?"
npm run dev -- --pattern hybrid     --thread demo --user analyst_1 "Is event evt_0051 consistent with dual control?"
```

Re-run with the same `--thread` to see short-term memory resume the conversation. Re-run with the same `--user` but a **new** `--thread` to see long-term memory carry over (see Memory below). `evt_0051` is the seeded dual-control violation (one operator both initiates and approves a high-value transfer); the ids are deterministic, so this holds after `npm run load`.

## Credentials: how the app gets its keys

The app never bakes secrets into the image or writes them to disk. On startup, `src/credentials.ts` calls the **DevDay credentials Lambda** (`get_token` task only) using your `PASSKEY` and mints, into `process.env` for that process only:

- **AWS keys** (`provider: "aws"`) → Bedrock SigV4 auth for the chat model.
- **Voyage key** (`provider: "voyageai"`) → embeddings and reranking.

The Lambda's `completion` task is deliberately **not** used. If a provider's keys are already present in the environment, that provider is skipped, so you can bypass the passkey entirely by exporting your own `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `VOYAGE_API_KEY`. Passkeys roll on a ~3-day window; a `401` means "get a fresh passkey." See `.assets/LAMBDA_USAGE.md` for the Lambda contract.

The chat model is reached through **AWS Bedrock** via `ChatBedrockConverse`, implemented only in `src/llm/model.ts`. No other module imports a model-provider SDK.

## Language (English / Spanish)

The scaffold is bilingual. `AGENT_LANGUAGE` (`en` or `es`) selects which prompt set loads, and therefore the language the agent answers in, including `structured_query`'s `explanation` and the hybrid `assess` judgment. Three prompt sites are localised, each as a folder of `en.ts` / `es.ts` / `index.ts`, with `index.ts` calling `pickLocalized()` from `src/i18n.ts`:

- `src/agent/prompts/` — the per-pattern system prompts
- `src/query/prompts/` — the aggregation-pipeline generator prompt
- `src/hybrid/prompts/` — the `assess` judgment prompt

**Translate prose only.** Identifiers, file paths, collection and env var names, npm commands, JSON keys (`pipeline`, `explanation`, `subjectId`, `question`, `citations`, `judgment`), MongoDB stage names, and the enums in `src/query/schema.ts` stay English in every language. So do the three verdict tokens `CONSISTENT`, `INCONSISTENT`, `NEEDS REVIEW`: they are enum-like values that `scripts/verify.ts` matches with a regex, so translating them breaks Checkpoint 3. The collection description in `src/query/schema.ts` also stays English on purpose (see the comment there).

Participant-facing material follows the same split: [`HOW-TO-USE.md`](./HOW-TO-USE.md) / [`HOW-TO-USE.es.md`](./HOW-TO-USE.es.md), and the phase prompts in [`prompts/en/`](./prompts/en) / [`prompts/es/`](./prompts/es).

The default is `en` in both the code and `env.example`. Set `AGENT_LANGUAGE="es"` for a Spanish delivery.

## Environment variables

Every variable is documented in `env.example`. The ones you must set: `MONGODB_URI` and `PASSKEY` (unless you supply your own keys). Notable defaults:

| Variable | Default                              | Purpose |
|---|--------------------------------------|---|
| `AGENT_LANGUAGE` | `en`                                 | language of the agent's prompts, and so of its answers (`en` \| `es`) |
| `MONGODB_DB` | `bootcamp`                           | DB for collections + checkpoints |
| `KB_COLLECTION` / `EVENTS_COLLECTION` | `kb_documents` / `activity_events`   | demo collections |
| `VECTOR_INDEX_NAME` | `vector_index`                       | Atlas Vector Search index |
| `BEDROCK_REGION` | `us-west-2`                          | Bedrock region (try `us-east-1` if invoke fails) |
| `BEDROCK_MODEL_ID` | `global.anthropic.claude-sonnet-4-6` | chat model |
| `VOYAGE_API_BASE` | `https://ai.mongodb.com/v1`          | host for embeddings + reranking; matches the Atlas `al-` key the Lambda mints. Use `https://api.voyageai.com/v1` only with your own Voyage `pa-` key |
| `VOYAGE_EMBEDDING_MODEL` / `VOYAGE_EMBEDDING_DIMENSIONS` | `voyage-4-large` / `1024`            | embeddings; dims MUST match the index |
| `VOYAGE_RERANK_MODEL` | `rerank-2.5`                         | reranking |
| `RETRIEVAL_TOP_K` / `RERANK_TOP_K` | `10` / `4`                           | candidates fetched / kept |
| `QUERY_RESULT_CAP` / `QUERY_MAX_TIME_MS` | `50` / `5000`                        | query-tool ergonomics (not security) |
| `REJECT_WRITE_STAGES` | `false`                              | optional `$out`/`$merge` guard, off by default |
| `MEMORY_COLLECTION` | `agent_memory`                       | long-term memory store collection |
| `MEMORY_TTL_SECONDS` | `0`                                  | long-term memory expiry (`0` = never; e.g. `2592000` for 30 days) |

## Sample data model

This is the shape of the **included sample scenario**, not a fixed schema. Your data replaces it; carry over the field conventions and the internal-consistency discipline, not the specific collections.

**`kb_documents`** (KB): each row is a chunk of a policy/runbook markdown doc, with `text`, a Voyage `embedding`, and `source` + `section` metadata for citation. A `vectorSearch` index (`vector_index`) over `embedding` with `numDimensions` matching the Voyage model.

**`activity_events`** (structured): one synthetic operational event per doc.

| Field | Type | Notes |
|---|---|---|
| `_id` | string | e.g. `evt_0001` |
| `userId` / `userName` | string | the actor |
| `action` | string | `LOGIN`, `BALANCE_QUERY`, `TRANSFER_INITIATED`, `TRANSFER_APPROVED`, `USER_CREATED`, `USER_MODIFIED` |
| `amount` | number | **minor units** (cents); non-zero only for transfers |
| `channel` | string | `WEB`, `MOBILE`, `API`, `BRANCH` |
| `status` | string | `SUCCESS`, `FAILED`, `PENDING` |
| `timestamp` | Date | BSON date (UTC) |

The generator is deterministic and **asserts its own consistency** before returning: the labeled "largest transfer this month" really is the largest, and per-user totals sum to the global total. It also seeds a dual-control violation (one operator initiates *and* approves a high-value transfer) for the hybrid demo. Indexes on `userId`, `action`, `timestamp`.

## Memory: short-term and long-term

The scaffold ships both memory mechanisms LangGraph provides, backed by MongoDB:

- **Short-term (checkpointer, `src/memory/checkpointer.ts`).** A `MongoDBSaver` persists the full message state of one conversation **thread**, keyed by `thread_id`. Re-invoking with the same `thread_id` resumes that conversation, even across process runs. This is what gives a single conversation continuity.
- **Long-term (store, `src/memory/store.ts`).** A `MongoDBStore` persists durable facts about a **user**, keyed by the namespace `[userId, "memories"]`, independent of any thread. The graph reads it automatically each turn (it injects known user context into the system prompt), and the agent writes to it with the `remember` tool. Available in every pattern, since memory is cross-cutting.

The two are orthogonal: `thread_id` scopes a conversation, `user_id` scopes long-term memory. Same `thread_id` = resume a chat; same `user_id` + new `thread_id` = a fresh chat that still knows the user.

**Reference discipline.** Long-term memory stores record **references** (ids) and lightweight context (team, role, preferences), never raw record contents or sensitive personal data. The `UserMemory` shape and the `remember` tool's schema are built to encourage this. Set `MEMORY_TTL_SECONDS` to expire memories on a retention window (for example 30 days); `0` keeps them indefinitely.

## Query tool posture (read-oriented; hardening out of scope)

`structured_query` is intentionally simple. The model is prompted to produce a read-only aggregation; execution applies a trailing `$limit` (clamping larger limits) and a `maxTimeMS`. **These are demo ergonomics, not security controls.** There is no validation, allowlist, role separation, or injection defense by design; query security is the adopting organization's responsibility during productization. The only sanctioned optional guard is a one-line `$out`/`$merge` rejection (`REJECT_WRITE_STAGES=true`), off by default.

On the bootcamp doc's "read-only enforcement and query guardrails" (Learning Objective 6, Theory Session 3, and the Checkpoint 3 line "any query-generating tool is read-only and validated per the guardrails"): in this reference scaffold that is a **teaching and productization topic, not a built-in layer**. The scaffold keeps the query tool minimal on purpose so teams can see the raw mechanism; adding real read-only enforcement and guardrails is part of what teams learn to reason about and what the adopting organization owns downstream. Teams that want to demonstrate it can flip `REJECT_WRITE_STAGES=true` and build outward from there.

## Repointing at your own data

1. Set `KB_COLLECTION`, `EVENTS_COLLECTION`, and `VECTOR_INDEX_NAME` in `.env`.
2. Replace the docs in `data/sample/kb/` and/or the generator in `data/sample/activity_events.ts` with your data. For structured data, the default is to fill in `data/mock-input/collection.md` (schema + a few hand-authored samples) and let Claude Code expand it into the generator, so no real data leaves its source system; see `data/mock-input/README.md`. Load a real export directly only if you already have an approved synthetic one.
3. If your Voyage embedding model changes, update `VOYAGE_EMBEDDING_MODEL` and `VOYAGE_EMBEDDING_DIMENSIONS` so the index dimension matches.
4. Update the plain-language description in `src/query/schema.ts` so the query tool understands your fields.
5. `npm run load`, then `npm run verify`.

## Adding a tool

1. Copy `src/tools/exampleBusinessTool.ts` to a new file; give it a clear `name`, `description`, and zod `schema`, and implement the async function (use `getDb()`, `getChatModel()`, `retrievePassages()`, etc.).
2. Import it in `src/tools/registry.ts` and add it to `allTools` (or add it to a specific pattern in `src/patterns.ts`).
3. The `description` and each field's `.describe()` are how the model decides when and how to call it. Be concrete.

## Acceptance checkpoints

`npm run verify` maps to the three bootcamp checkpoints: (1) the skeleton runs and answers a sample question per leg; (2) retrieval cites relevant passages, `structured_query` returns the correct records with its explanation, and hybrid draws on both legs; (3) at least two tools work, memory resumes on a repeated `thread_id`, and one demo scenario runs end to end.

## Notes on verified library APIs

The build confirmed current package APIs against the installed versions and official MongoDB docs. Where reality differed from the original build prompt's expectations:

- **LangChain JS is on 1.x** (`@langchain/core` 1.x, `@langchain/langgraph` 1.x, `@langchain/langgraph-checkpoint-mongodb` 1.x, `@langchain/mongodb` 1.x, `@langchain/aws` 1.x) and **zod is 4.x**. The `tool()`, `StateGraph`/`MessagesAnnotation`, `ToolNode` (from `@langchain/langgraph/prebuilt`), and `MongoDBSaver({ client, dbName })` (needs `.setup()`) APIs are as used here.
- **MongoDB Node driver:** the newest published driver is **7.5.0** (there is no 8.x on npm yet). The LangChain MongoDB packages depend on `mongodb@^6` and carry their own nested copy, so passing our 7.x `MongoClient`/`Collection` into them needs a small, commented cast at two boundaries (`memory/checkpointer.ts`, `retrieval/vectorStore.ts`). Runtime is compatible; only the nominal TS types differ.
- **Voyage** embeddings and reranking are called over the **REST API with `fetch`** (behind `src/retrieval/embeddings.ts` and `reranker.ts`) rather than via an SDK, to keep dependencies minimal and behavior transparent. `VoyageEmbeddings` implements the LangChain `Embeddings` interface so it plugs straight into the vector store.
- **Credentials** come from the Lambda's `get_token` task and live in memory only; the `completion` task is not used.
```
