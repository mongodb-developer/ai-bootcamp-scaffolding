# Build Prompts for Claude Code

Copy-paste starting prompts for building your agent with **Claude Code**, one file per hands-on phase. They are starting points, not scripts: adapt every `[BRACKETED]` part to your team's use case, and keep the conversation going with Claude Code as you iterate.

## How to use these

1. Open Claude Code in your Instruqt workspace, at the root of this repo.
2. Read [`../HOW-TO-USE.md`](../HOW-TO-USE.md) for what each phase is trying to achieve and its checkpoint.
3. Open the prompt file for your current phase, fill in the brackets, and paste the prompt you want into Claude Code.
4. Review what Claude Code proposes before accepting. Run `npm run typecheck` and `npm run dev` often. Do not batch a whole phase into one giant change.

## Why these prompts are shaped the way they are

- They point Claude Code at the **specific files** you should edit, so it changes the right thing and leaves the model client, credentials, and graph wiring alone.
- They ask for **small, verifiable steps** ending in a typecheck or a run, which matches how the checkpoints are graded.
- They respect the repo's guardrails. Claude Code already reads `CLAUDE.md` and `context.md`; these prompts reinforce the important ones (synthetic data only, keep the model client isolated, keep the query tool simple).

## Files

- [`phase-0-orientation.md`](./phase-0-orientation.md): understand the wiring and place your agent
- [`phase-1-foundation.md`](./phase-1-foundation.md): point the scaffold at your data (Checkpoint 1)
- [`phase-2-retrieval-and-query.md`](./phase-2-retrieval-and-query.md): sharpen retrieval and query correctness (Checkpoint 2)
- [`phase-3-tools-and-memory.md`](./phase-3-tools-and-memory.md): add tools, wire memory, run the demo (Checkpoint 3)
