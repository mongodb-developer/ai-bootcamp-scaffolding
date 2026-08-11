# Phase 2 Prompts: Intelligent Retrieval and Querying (Checkpoint 2)

Goal: correct, evidence-backed results for your sample queries. See [`../../HOW-TO-USE.md`](../../HOW-TO-USE.md#phase-2-intelligent-retrieval-and-querying-checkpoint-2).

Use the prompts for your pattern. Verify with `npm run verify` and spot-checks via `npm run dev`.

---

## Prompt (RAG): improve retrieval quality

```
My RAG answers are [DESCRIBE THE PROBLEM: missing the right passage / citing the wrong
section / too generic]. Help me improve retrieval quality:
1. Review chunking in data/load.ts for our documents and suggest a better split if
   sections are too big or too small.
2. Suggest values for RETRIEVAL_TOP_K and RERANK_TOP_K for our corpus size and explain
   the trade-off.
3. Confirm every returned passage keeps a source and section citation, and that the
   reranked order puts the most relevant passage first for these questions:
   [LIST 2-3 SAMPLE QUESTIONS].
4. Before tuning numbers further, tell me whether a different Voyage capability would fix
   this outright: contextualized chunk embeddings (voyage-context-4) if the losing
   passages depend on context outside their own chunk, a domain model (voyage-code-3,
   voyage-law-2, voyage-finance-2) if our vocabulary is specialized, rerank-2.5 with an
   instruction if the ordering is close but wrong, or rerank-2.5-lite if reranking is our
   latency cost. Say which one you would pick for our corpus and why.
Make one change at a time and re-run npm run load only if chunking changed.
```

## Prompt (structured): make queries verifiable correct

```
Help me make structured_query correct for these sample questions:
[LIST 3-5 SAMPLE QUESTIONS WITH THE ANSWER YOU EXPECT].

1. Improve the description in src/query/schema.ts so the model reliably produces the
   right aggregation (clarify field meanings, units, enum values, and how to handle
   dates).
2. For each question, run it via npm run dev and check the returned records, the
   plain-language explanation, and the pipeline. If a query is wrong, tell me whether
   the fix belongs in the schema description or the data.
3. Confirm our synthetic data is internally consistent for these answers.
Do not add validation or allowlists to the query tool; keep it simple per CLAUDE.md.
```

## Prompt (hybrid): make both legs contribute

```
For our hybrid use case, I want one answer that uses both retrieved policy and a
structured lookup, like the assess tool does. Using src/hybrid/hybridTool.ts as the
template, help me make sure that for [YOUR SAMPLE SCENARIO] the agent (a) pulls the
right record, (b) retrieves the relevant policy passages, and (c) reconciles them in a
grounded, cited answer. Show me where each leg's result enters the final prompt.
```

## Prompt: adapt the verify checks

```
Update scripts/verify.ts so Checkpoint 2 checks our data instead of the sample data:
retrieval returns a cited, relevant passage for [QUESTION]; structured_query returns the
correct records for [QUESTION] with an explanation; and (if hybrid) both legs contribute.
Base the expected values on our generator's exported expectations, not hard-coded
guesses. Run npm run verify and report what passes.
```

## Ideas to try in this phase

- Add a couple of near-miss documents or records so retrieval and queries have to discriminate, not just return the only match.
- For structured agents, test an aggregation (a count, a sum, a ranking), not just a lookup.
- Note any question that still fails; it is a good candidate for a dedicated tool in Phase 3.
