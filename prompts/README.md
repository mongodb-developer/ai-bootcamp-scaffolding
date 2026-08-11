# Build Prompts for Claude Code / Prompts de construcción para Claude Code

Copy-paste starting prompts for building your agent with **Claude Code**, one file per hands-on phase, in two languages. They are starting points, not scripts: adapt every `[BRACKETED]` part to your team's use case, and keep the conversation going with Claude Code as you iterate.

Prompts listos para copiar y pegar en **Claude Code**, un archivo por fase práctica, en dos idiomas. Son puntos de partida, no guiones: adapta cada parte entre `[CORCHETES]` al caso de uso de tu equipo y sigue conversando con Claude Code mientras iteras.

## English

Guide: [`../HOW-TO-USE.md`](../HOW-TO-USE.md)

- [`en/phase-0-orientation.md`](./en/phase-0-orientation.md): understand the wiring and place your agent
- [`en/phase-1-foundation.md`](./en/phase-1-foundation.md): point the scaffold at your data (Checkpoint 1)
- [`en/phase-2-retrieval-and-query.md`](./en/phase-2-retrieval-and-query.md): sharpen retrieval and query correctness (Checkpoint 2)
- [`en/phase-3-tools-and-memory.md`](./en/phase-3-tools-and-memory.md): add tools, wire memory, run the demo (Checkpoint 3)

## Español

Guía: [`../HOW-TO-USE.es.md`](../HOW-TO-USE.es.md)

- [`es/phase-0-orientation.md`](./es/phase-0-orientation.md): entiende el cableado y ubica tu agente
- [`es/phase-1-foundation.md`](./es/phase-1-foundation.md): apunta el scaffold a tus datos (Checkpoint 1)
- [`es/phase-2-retrieval-and-query.md`](./es/phase-2-retrieval-and-query.md): afina la recuperación y la corrección de las consultas (Checkpoint 2)
- [`es/phase-3-tools-and-memory.md`](./es/phase-3-tools-and-memory.md): agrega herramientas, conecta la memoria, corre la demo (Checkpoint 3)

Datos mock desde tu esquema: [`../data/mock-input/README.es.md`](../data/mock-input/README.es.md)

## How to use these / Cómo usarlos

1. Open Claude Code in your Instruqt workspace, at the root of this repo. / Abre Claude Code en tu workspace de Instruqt, en la raíz de este repo.
2. Read the guide for your language for what each phase is trying to achieve and its checkpoint. / Lee la guía en tu idioma para entender qué busca cada fase y cuál es su checkpoint.
3. Open the prompt file for your current phase, fill in the brackets, and paste the prompt you want into Claude Code. / Abre el archivo de prompts de tu fase, completa los corchetes y pega en Claude Code el prompt que quieras.
4. Review what Claude Code proposes before accepting. Run `npm run typecheck` and `npm run dev` often. Do not batch a whole phase into one giant change. / Revisa lo que Claude Code propone antes de aceptarlo. Ejecuta `npm run typecheck` y `npm run dev` seguido. No metas una fase entera en un solo cambio gigante.

## Why these prompts are shaped the way they are / Por qué los prompts están hechos así

- They point Claude Code at the **specific files** you should edit, so it changes the right thing and leaves the model client, credentials, and graph wiring alone.
- They ask for **small, verifiable steps** ending in a typecheck or a run, which matches how the checkpoints are graded.
- They respect the repo's guardrails. Claude Code already reads `CLAUDE.md` and `context.md`; these prompts reinforce the important ones (synthetic data only, keep the model client isolated, keep the query tool simple).

## Language note / Nota sobre el idioma

The agent's own language is set by `AGENT_LANGUAGE` in `.env` (`en` or `es`), which selects `src/agent/prompts/en.ts` or `es.ts`. Whichever language you work in, translate prose only: identifiers, file paths, npm commands, JSON keys, and the verdict tokens `CONSISTENT` / `INCONSISTENT` / `NEEDS REVIEW` stay in English, because `scripts/verify.ts` matches on them.

El idioma del agente lo define `AGENT_LANGUAGE` en `.env` (`en` o `es`), que selecciona `src/agent/prompts/en.ts` o `es.ts`. Trabajes en el idioma que trabajes, traduce solo la prosa: los identificadores, rutas de archivo, comandos npm, claves JSON y los tokens de veredicto `CONSISTENT` / `INCONSISTENT` / `NEEDS REVIEW` quedan en inglés, porque `scripts/verify.ts` los busca literalmente.
