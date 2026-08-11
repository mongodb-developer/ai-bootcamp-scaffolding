# CLAUDE.md

Standing instructions for Claude Code while a bootcamp team builds their agent on this scaffold. Read `HOW-TO-USE.md` for the phase-by-phase workflow and `context.md` / `README.md` for the architecture and data model. This file is the set of rules you do not break.

## What you're helping build

A team is turning this reference scaffold into their own enterprise AI agent on MongoDB Atlas, in roughly four to five hours. They pick one of three patterns (document-retrieval, structured-query, or hybrid), point the scaffold at their own data, add two to three business tools, and tune retrieval, prompts, and memory for their use case. These are proof-of-concept agents; the adopting organization hardens them later. Prioritize clarity, safe-enough defaults, and readable code over cleverness or production robustness. The people you are guiding are enterprise developers, many new to MongoDB.

## How to work here

- Follow the phases in `HOW-TO-USE.md`: Phase 1 foundation (Checkpoint 1), Phase 2 retrieval and query (Checkpoint 2), Phase 3 tools and memory (Checkpoint 3). Ready-to-adapt prompts live in `prompts/`.
- Make small, verifiable changes. After each change run `npm run typecheck`. After changing data, run `npm run load`. Try the result with `npm run dev`. Gate progress with `npm run verify`.
- Work at the scaffold's extension points; do not rewire the plumbing unless the team explicitly needs it.

## Where to edit, and where not to

- **Edit for your agent:** `src/patterns.ts` (which tools and prompt run), `src/agent/prompts/en.ts` and `es.ts` (persona), `data/sample/` (the team's data), `src/query/schema.ts` (how the query tool reads the fields), new tools under `src/tools/` registered in `src/tools/registry.ts`, `src/tools/memoryTools.ts`, and `.env`.
- **Leave alone unless truly necessary:** `src/llm/model.ts` (the model client), `src/credentials.ts` (credential bootstrap), `src/db/client.ts` (Mongo client), `src/agent/graph.ts` (the graph wiring).

## Invariants (do not violate without an explicit instruction that names the invariant)

1. **Synthetic data only.** No customer PII, no real transaction data, no regulated or production data. Use internal-facing, synthetic-or-approved data only, per the bootcamp Data Compliance rules. Never add code paths that assume real or production data.
2. **Provider isolation.** Reach the chat model only through `getChatModel()`. Only `src/llm/model.ts` imports a model-provider or gateway SDK; everything else depends on that contract and on `@langchain/core` types. Embeddings and reranking are always Voyage, wired in `src/retrieval`. Do not import provider SDKs elsewhere.
3. **Keep the query tool simple.** `structured_query` is read-oriented by prompt and applies a default result cap and a `maxTimeMS` for demo ergonomics only. Do not build a validation, allowlist, role-separation, or injection-defense layer; query security is out of scope for the bootcamp and is a productization topic. The only sanctioned addition is an optional one-line rejection of `$out` and `$merge`, off by default (`REJECT_WRITE_STAGES`).
4. **Config from the environment only.** All configuration is read and validated once in `src/config.ts`. No secrets in code, and no secrets in committed files. Keys are minted at runtime by `src/credentials.ts`; never hardcode them and never commit a real `.env`.

## Bilingual layout (English and Spanish)

The scaffold ships in both languages. `AGENT_LANGUAGE` (`en` | `es`) in `src/config.ts` selects the prompt set and therefore the language the agent answers in. Three prompt sites are localised, each a folder of `en.ts` / `es.ts` / `index.ts` whose `index.ts` calls `pickLocalized()` from `src/i18n.ts`. Use that same shape if you localise a fourth site; do not invent a second mechanism.

- `src/agent/prompts/` — the per-pattern system prompts (`RAG_PROMPT`, `STRUCTURED_PROMPT`, `HYBRID_PROMPT`)
- `src/query/prompts/` — the pipeline-generator prompt behind `structured_query`
- `src/hybrid/prompts/` — the `assess` judgment prompt

Participant-facing docs mirror it: `HOW-TO-USE.md` / `HOW-TO-USE.es.md`, `prompts/en/` / `prompts/es/`, `data/mock-input/README.md` / `README.es.md`. Change one language's file and keep the other equivalent.

**Translate prose, never identifiers.** In either language, leave in English: identifiers, type names, file paths, collection names, env var names, shell commands and npm script names, MongoDB stage names, the enums and the collection description in `src/query/schema.ts`, and JSON keys. The keys matter concretely: `src/query/queryTool.ts` parses the model's reply with a zod schema expecting exactly `pipeline` and `explanation`, and `src/hybrid/hybridTool.ts` returns `subjectId`, `question`, `citations`, `judgment`.

**The verdict-token hazard.** `CONSISTENT`, `INCONSISTENT`, and `NEEDS REVIEW` are enum-like values that `scripts/verify.ts` matches with a regex. Translating them into Spanish silently breaks Checkpoint 3 verification for the team that does it. Keep them uppercase English in every language's prompt and instruct the model to emit them verbatim even when answering in Spanish.

## Conventions

- TypeScript, strict mode, ESM modules, Node 20 or later. `strict: true` and `noUncheckedIndexedAccess: true` stay on.
- Each tool is its own file and registers through `src/tools/registry.ts`, then joins a pattern in `src/patterns.ts`.
- Keep to two or three business tools. A tool's `description` and its field `.describe()` text are how the model decides when and how to call it, so make them concrete.
- Memory follows the reference discipline: store record references and lightweight context (team, role, ids of interest), never raw record contents or sensitive personal data.
- Errors are explicit and actionable. Comments explain intent, not the obvious.
- **Reach for the purpose-built Voyage and MongoDB capability before the generic one.** When a team's retrieval, data, or query problem has a first-class feature that solves it, name that feature and explain the trade-off rather than tuning generic knobs in silence. Concretely: contextualized chunk embeddings (`voyage-context-4`, `/contextualizedembeddings`) when chunks lose meaning without their document; domain embedding models (`voyage-code-3`, `voyage-law-2`, `voyage-finance-2`) for specialized vocabulary; `voyage-multimodal-3.5` when documents carry diagrams or scans, since text and images share one vector space and one query retrieves both; `rerank-2.5` (or `rerank-2.5-lite` for latency) with an instruction when ordering is close but wrong; and on the MongoDB side Atlas Vector Search filters, Atlas Search, hybrid search, and the aggregation framework instead of post-processing in TypeScript. Recommend, do not silently switch: changing the embedding model changes the required index dimension and forces a re-load. Model names move fast, so confirm the current lineup against the Voyage docs and the preloaded MongoDB Agent Skills before you advise.
- Keep dependencies to what the agent needs; propose extras in the README rather than adding them silently. If you add a new integration, confirm its current API against official documentation and the preloaded MongoDB Agent Skills, since training data may lag.

## Definition of done (for the team's agent)

The three checkpoints pass against the team's own data: the skeleton answers a sample question (Checkpoint 1); retrieval cites relevant passages and `structured_query` returns correct records with an explanation, with hybrid drawing on both legs (Checkpoint 2); at least two tools work, memory resumes on a repeated `thread_id` and recalls across threads for the same `user_id`, and one demo scenario runs end to end (Checkpoint 3). `npm run typecheck` is clean, `npm run verify` passes, and no secrets are committed.
