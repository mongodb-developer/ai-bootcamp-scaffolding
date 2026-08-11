# How to Build Your Agent on This Scaffold

A participant guide for the AI Agent Development Bootcamp. You will not start from zero. This scaffold already gives you a working LangGraph agent on MongoDB: retrieval, structured query, a hybrid example, memory, and a demo CLI. Your job for the day is to point it at your data, write your two to three business tools, and tune it for the problem your team submitted.

You will build with **Claude Code** running in your Instruqt workspace. For every phase there is a set of ready-to-paste prompts in the [`prompts/`](./prompts) folder. Adapt the `[BRACKETED]` parts to your use case.

**¿Prefieres español?** Esta guía también está en [`HOW-TO-USE.es.md`](./HOW-TO-USE.es.md), y los prompts de cada fase están en [`prompts/es/`](./prompts/es). The scaffold ships bilingual: set `AGENT_LANGUAGE=es` in `.env` and the agent answers in Spanish.

The day has three hands-on phases, each ending at a checkpoint an instructor verifies. This guide is organized the same way, plus a short setup step and demo prep at the end.

---

## What you're building

Every team's agent is one of three patterns. Pick the one that matches the concept you submitted; your data and tools must match it.

- **Document-retrieval (RAG)**: answers from an unstructured knowledge base using vector search with reranking, and cites sources. For questions whose answers live in text: policies, runbooks, SOPs.
- **Structured-query**: answers by generating and running read-only MongoDB queries over structured records. For factual and analytical questions: who did what, when, how much, counts, rankings.
- **Hybrid**: does both in one answer: retrieve text context and query records, then reason over both. The strongest enterprise pattern and the one MongoDB is built for as a single data layer.

The scaffold ships one working tool per leg (`knowledge_base_search`, `structured_query`) plus a hybrid example (`assess`), so you always have a reference to copy.

---

## Phase 0: Setup and orientation

**Goal:** a green environment and a mental map of the scaffold before you change anything.

**Steps**

1. In the **Claude Code** tab, run `setup-keys.sh` and paste the passkey your instructor shows. It writes `PASSKEY` into `.env`. Your `.env` is already there and already points at the workspace's MongoDB; do not overwrite it.
2. In the **Console** tab, confirm the project compiles:
   ```bash
   cd /root/bootcamp && npm run typecheck
   ```
3. Smoke-test the shipped sample before you change anything:
   ```bash
   npm run load
   npm run verify
   npm run dev -- --pattern hybrid --thread demo --user analyst_1 "Is event evt_0051 consistent with dual control?"
   ```
4. Orient yourself. Read the "Understand the wiring" table below, then optionally ask Claude Code to walk you through it with [`prompts/en/phase-0-orientation.md`](./prompts/en/phase-0-orientation.md).

> Running this outside the Instruqt workspace? Create your env file first: `mv env.example .env.example`, `cp .env.example .env`, `npm install`, then set `MONGODB_URI` and `PASSKEY` yourself.

**Understand the wiring (where you will edit)**

| You want to change... | Edit... |
|---|---|
| Which pattern and tools run | `src/patterns.ts` |
| The system prompt / persona | `src/agent/prompts/` |
| Your knowledge base documents | `data/sample/kb/` (+ `data/load.ts` if your format differs) |
| Your structured data | `data/sample/activity_events.ts` (the generator) |
| Structured data from a schema + a few samples (no export) | `data/mock-input/collection.md`, then Option A in `prompts/en/phase-1-foundation.md` |
| How the query tool understands your fields | `src/query/schema.ts` (checklist in its header) |
| A new business tool | copy `src/tools/exampleBusinessTool.ts`, then register in `src/tools/registry.ts` |
| What the agent remembers about a user | `src/tools/memoryTools.ts` + `src/memory/store.ts` |
| The language the agent answers in | `AGENT_LANGUAGE` in `.env` (`en` or `es`), which selects `src/agent/prompts/en.ts` or `es.ts` |
| Collection names, retrieval/query tuning | `.env` (see `README.md` variable table) |

Things you should **not** need to touch: `src/llm/model.ts` (the model client), `src/credentials.ts`, `src/db/client.ts`, `src/agent/graph.ts`. The invariants in `CLAUDE.md` still apply to your build; Claude Code will follow them.

---

## Phase 1: Foundation (Checkpoint 1)

**Goal:** the skeleton runs and answers one of your own sample questions against your data.

> No data of your own yet? The shipped sample scenario runs as-is. Do this phase against it and swap in your data when it is ready; the steps are the same.

**What you'll edit:** `.env` (collection names), `data/sample/kb/` and/or `data/sample/activity_events.ts`, `src/query/schema.ts`, `src/patterns.ts`.

**Steps**

1. Decide your pattern and, if needed, trim `toolsForPattern` in `src/patterns.ts` so your agent exposes only the legs you use.
2. Put your data in place:
   - **RAG / hybrid:** replace the markdown in `data/sample/kb/` with your documents (policies, runbooks, SOPs). Keep them internal-facing and synthetic-or-approved per the Data Compliance rules.
   - **Structured / hybrid:** by default, do not export real records. Fill in `data/mock-input/collection.md` with your schema plus a few hand-authored samples and let Claude Code expand them into a full, internally consistent mock dataset; nothing real leaves its source system, so data-owner sign-off, classification, and security review stay off the critical path. See [`data/mock-input/README.md`](./data/mock-input/README.md) and Option A in the Phase 1 prompts. Either way, the query tool needs the plain-language description in `src/query/schema.ts` updated to match your fields. Only if you already have an approved synthetic export do you load it directly (Option B).
3. Point env at your collections if you renamed them (`KB_COLLECTION`, `EVENTS_COLLECTION`, `VECTOR_INDEX_NAME`).
4. Seed and index:
   ```bash
   npm run load
   ```
5. Ask your agent one real question:
   ```bash
   npm run dev -- --pattern <your-pattern> --thread demo --user me "your sample question"
   ```

**Build it with Claude Code:** [`prompts/en/phase-1-foundation.md`](./prompts/en/phase-1-foundation.md)

**Checkpoint 1 gate:** the skeleton runs and answers one sample question. RAG teams get a grounded answer from the knowledge base; structured teams get a correct answer from a query against their collection; hybrid teams get either leg working end to end.

**Verify:** `npm run typecheck` is clean, `npm run load` succeeds, and the `npm run dev` call above returns a sensible answer. `npm run verify` checks the shipped sample scenario, so its questions stop matching once your own knowledge base is in place; your instructor gates on your own question, not on that script.

---

## Phase 2: Intelligent retrieval and querying (Checkpoint 2)

**Goal:** correct, evidence-backed results for your sample queries.

**What you'll edit:** retrieval tuning in `.env`, chunking in `data/load.ts`, the schema description in `src/query/schema.ts`, your generator's consistency in `data/sample/activity_events.ts`.

**By pattern**

- **RAG:** improve recall and precision. Tune `RETRIEVAL_TOP_K` and `RERANK_TOP_K`, revisit how documents are chunked in `data/load.ts` (section-per-chunk is the default), and confirm every answer carries a `source` and `section` citation. Check that the reranked passages are actually the relevant ones.
- **Structured:** make answers provably correct. Sharpen the description in `src/query/schema.ts` (field meanings, units, the enum values) so the model writes good pipelines. Your synthetic data must be internally consistent: the record you call "largest this month" must actually be the largest, and totals must add up. The tool returns the records, a plain-language explanation, and the pipeline it ran; use the explanation to confirm the query is doing what you expect.
- **Hybrid:** get both legs contributing and reconciled in one answer. Use `assess` as the template for fusing a record lookup with retrieved text.

**Build it with Claude Code:** [`prompts/en/phase-2-retrieval-and-query.md`](./prompts/en/phase-2-retrieval-and-query.md)

**Checkpoint 2 gate:** retrieval returns reranked, relevant, cited passages; `structured_query` returns the correct records for your sample questions with its explanation; hybrid shows both legs contributing.

**Verify:** run `npm run verify` (adapt the checks in `scripts/verify.ts` to your data's known-correct answers), and spot-check a few sample questions with `npm run dev`.

---

## Phase 3: Complete your agent (Checkpoint 3)

**Goal:** your two to three business tools working, memory that improves the experience, and one demo scenario running end to end.

**What you'll edit:** new files under `src/tools/`, `src/tools/registry.ts`, `src/patterns.ts`, `src/agent/prompts/`, optionally `src/tools/memoryTools.ts`.

**Steps**

1. **Add your business tools.** Copy `src/tools/exampleBusinessTool.ts` for each new tool, give it a clear `name`, `description`, and zod `schema`, and implement the logic (use `getDb()`, `getChatModel()`, `retrievePassages()` as needed). Register each in `src/tools/registry.ts` and add it to your pattern in `src/patterns.ts`. Keep it to two to three simple tools; the `description` is how the model decides when to call it, so be concrete.
2. **Wire memory.** Short-term memory already works: the same `--thread` resumes a conversation. For long-term memory that spans conversations, use the `remember` tool and decide what is worth keeping about a user (their team, role, preferences, or ids of records they care about). Follow the reference discipline: store references and lightweight context, never raw record contents. Same `--user` with a new `--thread` should carry that context over.
3. **Tune the prompt** in `src/agent/prompts/` so the agent's persona and instructions fit your users. Edit the file for the language you present in (`en.ts` or `es.ts`). Translate prose only: tool names, JSON keys, and the verdict tokens `CONSISTENT` / `INCONSISTENT` / `NEEDS REVIEW` stay in English, because `scripts/verify.ts` matches on them.
4. **Run your demo scenario** end to end with `npm run dev`, exactly as you will show it.

**Build it with Claude Code:** [`prompts/en/phase-3-tools-and-memory.md`](./prompts/en/phase-3-tools-and-memory.md)

**Checkpoint 3 gate:** at least two tools working, memory persisting across sessions (same `thread_id` resumes; same `user_id` recalls across threads), and one demo scenario running end to end.

**Verify:** `npm run typecheck` clean, `npm run verify` passing against your data, and your demo scenario runs cleanly from a cold start.

---

## Demo prep and showcase

Keep your PoC presentation current after every checkpoint; do not leave it for the end. Your showcase is a **5-minute live demo** against the success criteria in your approved concept, plus 2 minutes of Q&A.

A strong demo:

- Runs the real agent live (`npm run dev`), not slides of screenshots.
- Shows your pattern doing the thing your concept promised, with citations or correct numbers on screen.
- Demonstrates memory: a follow-up question in the same thread, or a new session that still knows the user.
- States the business value in one line (the metric your concept targeted).

---

## Quick reference

**Commands**

```bash
npm run typecheck   # types are clean
npm run load        # (re)seed your KB + structured data, build the vector index
npm run verify      # run the checkpoint checks against your data
npm run dev -- --pattern <rag|structured|hybrid> --thread <id> --user <id> "question"
```

**Troubleshooting**

- **`401` from the credential step:** your passkey expired. Re-run the setup-keys script to write a fresh one into `.env`.
- **Bedrock invoke fails on region/model:** try `BEDROCK_REGION=us-east-1` in `.env`; the global model profile routes cross-region.
- **Vector search returns nothing right after load:** the index is still building. `npm run load` waits for it, but if you created data another way, give the index a minute.
- **`403` from Voyage, "This API key cannot access this endpoint":** the key and the host are from different families. The passkey mints an Atlas model API key (`al-...`), which works only against `https://ai.mongodb.com/v1`, the scaffold's default `VOYAGE_API_BASE`. Set it to `https://api.voyageai.com/v1` only if you supplied your own Voyage key (`pa-...`).
- **Embedding dimension error:** `VOYAGE_EMBEDDING_DIMENSIONS` must match your `VOYAGE_EMBEDDING_MODEL`. If you change the model, re-load so the index is rebuilt at the right dimension.
- **Query tool posture:** the query tool is read-oriented with a result cap and timeout for demo smoothness. Building real read-only enforcement and guardrails is a productization topic (see `README.md`); it is not required for the checkpoints.

For deeper detail on the architecture, environment variables, and the data model, see [`README.md`](./README.md).
