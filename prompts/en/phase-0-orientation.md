# Phase 0 Prompts: Orientation

Goal: understand the scaffold's wiring and decide where your agent fits before you change anything. See [`../../HOW-TO-USE.md`](../../HOW-TO-USE.md#phase-0-setup-and-orientation).

Fill in the brackets, then paste into Claude Code.

---

## Prompt: walk me through the wiring

```
Read context.md, CLAUDE.md, and HOW-TO-USE.md. In about ten lines, explain how this
scaffold works end to end: how a question flows from the CLI through the LangGraph
agent, the tools, retrieval, the query tool, and memory. Then list the exact files I
would edit to build a [rag | structured | hybrid] agent, and the files I should leave
alone. Do not change any code yet.
```

## Prompt: place my agent

```
Our team's use case: [ONE OR TWO SENTENCES: who the users are and what problem the
agent solves]. Our chosen pattern is [rag | structured | hybrid].

Given this scaffold, tell me:
1. Whether my pattern fits the use case, or if another pattern fits better and why.
2. What data I need in place (a knowledge base, a structured collection, or both) and
   which files hold it.
3. The two or three business tools this agent will likely need, described in one line
   each. Do not implement anything yet; I want a plan for Phase 1.
```

## Prompt: sanity-check my environment

```
Help me confirm my environment is ready without exposing any secrets. Check that .env
has MONGODB_URI and PASSKEY set, run npm run typecheck, and tell me what to fix if
anything fails. Do not print the values of any environment variables.
```
