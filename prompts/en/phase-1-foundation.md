# Phase 1 Prompts: Foundation (Checkpoint 1)

Goal: the skeleton runs and answers one sample question from your data. See [`../../HOW-TO-USE.md`](../../HOW-TO-USE.md#phase-1-foundation-checkpoint-1).

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
3. Our chunks lose meaning without their surrounding document ("the threshold" in a
   section that never repeats what it applies to). Tell me whether contextual chunking
   with Voyage's contextualized chunk embeddings (voyage-context-4, via the
   /contextualizedembeddings endpoint, which embeds each chunk aware of the whole
   document) would measurably help our corpus, or whether plain voyage-4-large is enough
   here. If it helps, show me what changes in src/retrieval/embeddings.ts and
   data/load.ts, and confirm VOYAGE_EMBEDDING_DIMENSIONS still matches the vector index.
4. Point out any other Voyage or MongoDB Atlas capability that fits our data better than
   the defaults: a domain-specific embedding model (voyage-code-3 for code, voyage-law-2,
   voyage-finance-2), voyage-multimodal-3.5 if our documents carry diagrams or scanned
   pages (text and images share one vector space, so we can retrieve both with one
   query), or Atlas Search / hybrid search alongside vector search. Recommend one, with
   the trade-off in a line; do not change models without telling me why.
5. Keep everything synthetic or approved for the event per the Data Compliance rules.
After I add the files, guide me through npm run load and confirm the vector index builds.
```

## Prompt (structured / hybrid): model my collection and data

The default for structured teams is **Option A**: bring a schema and a few hand-authored
samples and let the prompt expand them into a full mock dataset, so no real data ever leaves
its source system (no export, no data-owner sign-off, no classification or security review on
the critical path). Use **Option B** only if you already have an approved, exported synthetic
dataset in hand.

### Option A: generate mock data from your schema and samples (default)

First fill in `data/mock-input/collection.md` (schema, enums, units, consistency rules, the
verifiable facts your demo must answer, and 3 to 5 hand-authored sample records). Then:

```
Read data/mock-input/collection.md. Using it as the spec, rewrite
data/sample/activity_events.ts into a deterministic generator for our collection, modeled
on the existing bank generator:

1. Keep it deterministic (fixed seed => identical dataset every run) and generate about the
   volume I specified, drawing realistic values from my fields, enums, and units.
2. Seed one anchor record for each "verifiable fact" I listed, and ASSERT every one of them
   plus my consistency rules before returning; if any assertion fails, throw so load stops.
   Export the expectations so scripts/verify.ts can check them.
3. Update the plain-language description in src/query/schema.ts to match my fields, types,
   enums, and units. Follow the five-point checklist in that file's header comment; the
   traps and the question-to-field guidance matter more than the field list.
4. Update EVENTS_COLLECTION in .env if the collection name differs.
Keep synthetic data only, and do not touch the model client, credentials, or the graph.
Run npm run typecheck, then walk me through npm run load.
```

### Option B: load a dataset I already exported (only if you have one)

```
Our structured data is [DESCRIBE: the entity, the key fields and their types, and the
enum values, e.g. support_tickets with status, priority, assignee, createdAt]. Amounts
or quantities are in [UNITS].

1. Rewrite data/sample/activity_events.ts to model our collection instead, keeping the
   generator deterministic and internally consistent (assert that the record we will
   call "[YOUR SUPERLATIVE, e.g. oldest open ticket]" really is, and that any totals add
   up). Export expectations the verify script can check.
2. Update the plain-language description in src/query/schema.ts to match our fields,
   types, and enums. Follow the five-point checklist in that file's header comment; the
   traps and the question-to-field guidance matter more than the field list.
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
