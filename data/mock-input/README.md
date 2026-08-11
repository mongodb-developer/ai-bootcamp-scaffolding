# Mock data from your schema and samples

This folder is the **default** way structured-query and hybrid teams get their data ready for the bootcamp. Instead of exporting real records, you describe your collection's **schema** and hand-author a **few representative sample records** here, then a Claude Code prompt expands them into a full, internally consistent mock dataset for the event. Export and load a real dataset only if you already have an approved synthetic one in hand.

*(Versión en español: [`README.es.md`](./README.es.md))*

## Why this path exists

The bootcamp's Data Compliance rules are strict, and for good reason: no customer PII, no real transaction data, no regulated datasets, data-owner sign-off before anything leaves its source system, a classification step, and any security or compliance review finished a week before the event. For a structured-query or hybrid agent, clearing all of that just to obtain a demo dataset is often the single biggest speedbump in the run-up to the event.

You do not need real data to build a convincing structured-query demo. You need a faithful **schema** and data that is **internally consistent**, so the agent's answers are verifiable. Because you author the samples by hand from your knowledge of the shape of the data, nothing real ever leaves its source system. There is no export, so no data-owner sign-off, no classification, and no security review sit on the critical path. You still stay well inside the hard rules: the data is synthetic and internal-facing.

## How it works (all copy + paste, nothing to upload)

Your Instruqt workspace already contains this folder. You never upload files into the environment; you fill these templates in place (paste your content into them in the editor, or paste it straight into the Claude Code prompt), then run the prompt.

1. Open `collection.md` and fill it in: your collection name, fields and types, enum values, units, the consistency rules, the **verifiable facts** your demo must answer correctly, and 3 to 5 hand-authored sample records.
2. Open [`../../prompts/en/phase-1-foundation.md`](../../prompts/en/phase-1-foundation.md), find **"Option A: generate mock data from your schema and samples,"** and paste that prompt into Claude Code.
3. Claude Code rewrites `data/sample/activity_events.ts` into a deterministic, self-asserting generator for **your** collection, and updates the schema description in `src/query/schema.ts`.
4. Run `npm run typecheck`, then `npm run load`. The generator asserts its own internal consistency before any data is inserted, so a bad dataset fails loudly instead of producing wrong demo answers.

## What "internally consistent" means

Structured answers have a sharp correctness bar: if your agent will answer "largest order this quarter," one record must actually be the largest, and any totals it reports must add up. The generator the prompt produces bakes this in by seeding **anchor records** (your labeled superlatives and edge cases) and asserting the facts hold before load proceeds. That is why `collection.md` asks you to list the verifiable facts up front: they become the assertions.

The shipped bank scenario in `data/sample/activity_events.ts` is the reference the prompt copies from. Leave it in place; it is both the template and the fallback if your input is not ready.
