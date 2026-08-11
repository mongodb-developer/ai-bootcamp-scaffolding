# Phase 3 Prompts: Tools, Memory, and Demo (Checkpoint 3)

Goal: your two to three business tools working, memory that improves the experience, and one demo scenario end to end. See [`../../HOW-TO-USE.md`](../../HOW-TO-USE.md#phase-3-complete-your-agent-checkpoint-3).

---

## Prompt: add a business tool

```
I want to add a tool called [TOOL_NAME] that [WHAT IT DOES AND WHEN THE AGENT SHOULD USE
IT]. Its inputs are [FIELDS AND TYPES], and it reads from [DATA SOURCE: which collection,
retrieval, or a computation].

Using src/tools/exampleBusinessTool.ts as the template:
1. Create src/tools/[toolName].ts with a clear name, a description written to help the
   model decide when to call it, and a zod schema with described fields.
2. Implement the logic using getDb() / retrievePassages() / getChatModel() as needed.
   Keep it read-oriented.
3. Register it in src/tools/registry.ts and add it to my pattern in src/patterns.ts.
Run npm run typecheck, then test it with npm run dev on this question: [SAMPLE QUESTION].
```

## Prompt: design my 2-3 tools together

```
Here is our agent's job: [ONE OR TWO SENTENCES]. Propose the two or three tools it needs
(no more), each with a one-line purpose, its inputs, and its data source. Flag any that
overlap with the built-in knowledge_base_search or structured_query so we reuse instead
of duplicating. Then we will implement them one at a time.
```

## Prompt: wire long-term memory

```
I want the agent to remember useful context about a user across sessions. For our users,
the worth-remembering things are [EXAMPLES: their team, role, region, or ids of records
they are tracking].

1. Confirm how the remember tool and src/memory/store.ts work today, and that recalled
   context is injected into the prompt automatically.
2. Adjust the remember tool's description/schema if our memory needs a different shape,
   keeping the reference discipline (store references and lightweight context, never raw
   record contents or sensitive personal data).
3. Show me how to demonstrate it: save a fact in one thread, then recall it from a new
   thread with the same --user.
```

## Prompt: tune the persona and prompt

```
Refine the system prompt for our [PATTERN] agent so it speaks to [OUR USERS] and always
[DESIRED BEHAVIOR: cites sources / states the query it ran / gives a verdict]. Edit the
file for the language we are presenting in: src/agent/prompts/en.ts or
src/agent/prompts/es.ts (AGENT_LANGUAGE in .env selects which one loads). If you change
one, keep the other equivalent. Translate prose only: leave tool names, JSON keys, and
the verdict tokens CONSISTENT / INCONSISTENT / NEEDS REVIEW in English. Keep it concise.
Show me the before and after.
```

## Prompt: rehearse the demo scenario

```
Help me make our Checkpoint 3 and showcase demo reliable. The scenario is: [DESCRIBE THE
DEMO: the question(s) a user asks and what a great answer looks like].
1. Run it end to end with npm run dev from a cold start and confirm it works.
2. Include a memory moment (a follow-up in the same thread, or a new thread that still
   knows the user).
3. Point out anything flaky and the smallest fix. Then run npm run verify to confirm the
   checkpoint checks still pass.
```

## Ideas to try in this phase

- Keep tools to two or three. More tools make the agent harder to steer, not smarter.
- Give each tool a description that says both what it does and when to prefer it over another tool.
- Practice the 5-minute demo out loud; make sure a citation or a correct number is on screen.
- Update your PoC presentation now, while the results are fresh.
