# Phase 1 Prompts: Foundation (Checkpoint 1)

Goal: the skeleton runs and answers one sample question from your data. See [`../HOW-TO-USE.md`](../HOW-TO-USE.md#phase-1-foundation-checkpoint-1).

Work in small steps. After each change, run `npm run typecheck`, and after data changes, `npm run load`.

---

## Prompt: select my pattern

```
I am building a [rag | structured | hybrid] agent. Update src/patterns.ts so my pattern
exposes only the tools it needs, and adjust the system prompt selection if needed. Keep
the other patterns intact so I can compare. Run npm run typecheck when done.
```

## Prompt (RAG / hybrid): load my knowledge base

```
Replace the sample knowledge base with ours. Our documents are [DESCRIBE: e.g. 8 markdown
runbooks about VPN and access issues]. I will put the files in data/sample/kb/.

1. Tell me the format and folder layout you expect.
2. Review how data/load.ts chunks documents and adjust it if our structure needs it
   (we want one chunk per [SECTION / HEADING / OTHER], with source and section metadata
   for citations).
3. Keep everything synthetic or approved for the event per the Data Compliance rules.
After I add the files, guide me through npm run load and confirm the vector index builds.
```

## Prompt (structured / hybrid): model my collection and data

```
Our structured data is [DESCRIBE: the entity, the key fields and their types, and the
enum values, e.g. support_tickets with status, priority, assignee, createdAt]. Amounts
or quantities are in [UNITS].

1. Rewrite data/sample/activity_events.ts to model our collection instead, keeping the
   generator deterministic and internally consistent (assert that the record we will
   call "[YOUR SUPERLATIVE, e.g. oldest open ticket]" really is, and that any totals add
   up). Export expectations the verify script can check.
2. Update the plain-language description in src/query/schema.ts to match our fields,
   types, and enums, with guidance on how to answer our common questions.
3. Update EVENTS_COLLECTION in .env if we renamed it.
Run npm run typecheck, then walk me through npm run load.
```

## Prompt: ask the first real question

```
Help me run one sample question end to end for Checkpoint 1:
  npm run dev -- --pattern [PATTERN] --thread demo --user me "[YOUR SAMPLE QUESTION]"
If the answer is wrong or empty, diagnose whether it is the data, the retrieval/query,
or the prompt, and propose the smallest fix. Do not change the model client, credentials,
or the graph.
```

## Ideas to try in this phase

- Ask two or three of your real sample questions and note which ones already work.
- For RAG, confirm the answer cites a real source and section.
- For structured, confirm the number matches a value you can compute by hand from your generator.
- Keep the dataset small but representative; you can grow it in Phase 2.
