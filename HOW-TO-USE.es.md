# Cómo construir tu agente sobre este scaffold

Guía para participantes del AI Agent Development Bootcamp. No empiezas desde cero. Este scaffold ya te entrega un agente de LangGraph funcionando sobre MongoDB: recuperación, consulta estructurada, un ejemplo híbrido, memoria y una CLI de demo. Tu trabajo del día es apuntarlo a tus datos, escribir tus dos o tres herramientas de negocio y afinarlo para el problema que propuso tu equipo.

Vas a construir con **Claude Code** corriendo en tu workspace de Instruqt. Para cada fase hay un set de prompts listos para pegar en la carpeta [`prompts/es/`](./prompts/es). Adapta las partes entre `[CORCHETES]` a tu caso de uso.

**Prefer English?** This guide is also available at [`HOW-TO-USE.md`](./HOW-TO-USE.md), with the English prompts in [`prompts/en/`](./prompts/en).

El día tiene tres fases prácticas, cada una terminando en un checkpoint que verifica un instructor. Esta guía está organizada igual, más un paso corto de instalación y la preparación de la demo al final.

---

## Idioma del agente

El scaffold es bilingüe. `AGENT_LANGUAGE` en `.env` (`en` o `es`) decide qué set de prompts se carga (`src/agent/prompts/en.ts` o `es.ts`) y, por lo tanto, en qué idioma responde el agente, incluidas las explicaciones de sus consultas y los juicios de la herramienta híbrida. Tu `.env` viene con `AGENT_LANGUAGE="en"`; cámbialo a `"es"` para que el agente te responda en español.

Una regla que no se rompe: **se traduce la prosa, nunca los identificadores.** Los nombres de archivo, colecciones, variables de entorno, comandos npm, claves JSON (`pipeline`, `explanation`, `subjectId`, `question`, `citations`, `judgment`) y los tokens de veredicto `CONSISTENT`, `INCONSISTENT` y `NEEDS REVIEW` quedan en inglés en todos los idiomas. `scripts/verify.ts` los busca literalmente: traducirlos rompe la verificación del Checkpoint 3.

---

## Qué vas a construir

El agente de cada equipo es uno de tres patrones. Elige el que coincida con el concepto que enviaste; tus datos y tus herramientas deben coincidir con él.

- **Recuperación de documentos (RAG)**: responde desde una base de conocimiento no estructurada usando búsqueda vectorial con reranking, y cita las fuentes. Para preguntas cuya respuesta vive en texto: políticas, runbooks, SOPs.
- **Consulta estructurada (structured)**: responde generando y ejecutando consultas de MongoDB de solo lectura sobre registros estructurados. Para preguntas factuales y analíticas: quién hizo qué, cuándo, cuánto, conteos, rankings.
- **Híbrido (hybrid)**: hace ambas cosas en una sola respuesta: recupera contexto de texto y consulta registros, y luego razona sobre ambos. Es el patrón empresarial más fuerte y para el que MongoDB está construido como capa de datos única.

El scaffold trae una herramienta funcionando por cada vía (`knowledge_base_search`, `structured_query`) más un ejemplo híbrido (`assess`), así que siempre tienes una referencia que copiar.

---

## Fase 0: Instalación y orientación

**Objetivo:** un entorno en verde y un mapa mental del scaffold antes de cambiar nada.

**Pasos**

1. En la pestaña **Claude Code**, ejecuta `setup-keys.sh` y pega el passkey que muestre tu instructor. El script escribe `PASSKEY` en `.env`. Tu `.env` ya existe y ya apunta al MongoDB del workspace; no lo sobrescribas.
2. En la pestaña **Console**, confirma que el proyecto compila:
   ```bash
   cd /root/bootcamp && npm run typecheck
   ```
3. Prueba el escenario de ejemplo antes de cambiar nada:
   ```bash
   npm run load
   npm run verify
   npm run dev -- --pattern hybrid --thread demo --user analyst_1 "Is event evt_0051 consistent with dual control?"
   ```
4. Oriéntate. Lee la tabla "Entiende la estructura" más abajo y, si quieres, pídele a Claude Code que te lo explique con [`prompts/es/phase-0-orientation.md`](./prompts/es/phase-0-orientation.md).

> ¿Corres esto fuera del workspace de Instruqt? Crea primero tu archivo de entorno: `mv env.example .env.example`, `cp .env.example .env`, `npm install`, y luego define `MONGODB_URI` y `PASSKEY` tú mismo.

**Entiende la estructura (dónde vas a editar)**

| Quieres cambiar... | Edita... |
|---|---|
| Qué patrón y qué herramientas corren | `src/patterns.ts` |
| El system prompt / la persona | `src/agent/prompts/` (`en.ts` o `es.ts`) |
| El idioma en que responde el agente | `AGENT_LANGUAGE` en `.env` (`en` o `es`) |
| Los documentos de tu base de conocimiento | `data/sample/kb/` (+ `data/load.ts` si tu formato es distinto) |
| Tus datos estructurados | `data/sample/activity_events.ts` (el generador) |
| Datos estructurados desde un esquema + unas muestras (sin exportar) | `data/mock-input/collection.md`, luego la Opción A en `prompts/es/phase-1-foundation.md` |
| Cómo la herramienta de consulta entiende tus campos | `src/query/schema.ts` (lista en su encabezado) |
| Una nueva herramienta de negocio | copia `src/tools/exampleBusinessTool.ts` y regístrala en `src/tools/registry.ts` |
| Qué recuerda el agente sobre un usuario | `src/tools/memoryTools.ts` + `src/memory/store.ts` |
| Nombres de colecciones, ajuste de recuperación/consulta | `.env` (ver la tabla de variables en `README.md`) |

Cosas que **no** deberías necesitar tocar: `src/llm/model.ts` (el cliente del modelo), `src/credentials.ts`, `src/db/client.ts`, `src/agent/graph.ts`. Los invariantes de `CLAUDE.md` siguen aplicando a tu build; Claude Code los va a respetar.

---

## Fase 1: Fundación (Checkpoint 1)

**Objetivo:** que el esqueleto corra y responda una de tus propias preguntas de muestra contra tus datos.

> ¿Todavía no tienes datos propios? El escenario de ejemplo que viene incluido corre tal cual. Haz esta fase contra él y cambia tus datos cuando estén listos; los pasos son los mismos.

**Qué vas a editar:** `.env` (nombres de colecciones), `data/sample/kb/` y/o `data/sample/activity_events.ts`, `src/query/schema.ts`, `src/patterns.ts`.

**Pasos**

1. Decide tu patrón y, si hace falta, recorta `toolsForPattern` en `src/patterns.ts` para que tu agente exponga solo las vías que usas.
2. Pon tus datos en su lugar:
   - **RAG / híbrido:** reemplaza el markdown de `data/sample/kb/` con tus documentos (políticas, runbooks, SOPs). Mantenlos de uso interno y sintéticos o aprobados, según las reglas de Data Compliance.
   - **Structured / híbrido:** por defecto, no exportes registros reales. Completa `data/mock-input/collection.md` con tu esquema más unas pocas muestras escritas a mano y deja que Claude Code las expanda en un dataset mock completo e internamente consistente; nada real sale de su sistema de origen, así que la aprobación del data owner, la clasificación y la revisión de seguridad quedan fuera de la ruta crítica. Ver [`data/mock-input/README.es.md`](./data/mock-input/README.es.md) y la Opción A en los prompts de la Fase 1. En cualquier caso, la herramienta de consulta necesita que actualices la descripción en lenguaje natural de `src/query/schema.ts` para que coincida con tus campos (esa descripción se mantiene en inglés a propósito). Solo si ya tienes una exportación sintética aprobada la cargas directamente (Opción B).
3. Apunta el entorno a tus colecciones si les cambiaste el nombre (`KB_COLLECTION`, `EVENTS_COLLECTION`, `VECTOR_INDEX_NAME`).
4. Carga e indexa:
   ```bash
   npm run load
   ```
5. Hazle a tu agente una pregunta real:
   ```bash
   npm run dev -- --pattern <tu-patrón> --thread demo --user me "tu pregunta de muestra"
   ```

**Constrúyelo con Claude Code:** [`prompts/es/phase-1-foundation.md`](./prompts/es/phase-1-foundation.md)

**Puerta del Checkpoint 1:** el esqueleto corre y responde una pregunta de muestra. Los equipos RAG obtienen una respuesta fundamentada desde la base de conocimiento; los equipos structured obtienen una respuesta correcta desde una consulta contra su colección; los equipos híbridos tienen cualquiera de las dos vías funcionando de punta a punta.

**Verifica:** `npm run typecheck` limpio, `npm run load` exitoso, y que la llamada a `npm run dev` de arriba devuelva una respuesta sensata. `npm run verify` comprueba el escenario de ejemplo que viene incluido, así que sus preguntas dejan de aplicar cuando pongas tu propia base de conocimiento; tu instructor evalúa con tu pregunta, no con ese script.

---

## Fase 2: Recuperación y consulta inteligentes (Checkpoint 2)

**Objetivo:** resultados correctos y respaldados por evidencia para tus preguntas de muestra.

**Qué vas a editar:** el ajuste de recuperación en `.env`, el chunking en `data/load.ts`, la descripción del esquema en `src/query/schema.ts`, la consistencia de tu generador en `data/sample/activity_events.ts`.

**Por patrón**

- **RAG:** mejora recall y precisión. Ajusta `RETRIEVAL_TOP_K` y `RERANK_TOP_K`, revisa cómo se dividen los documentos en `data/load.ts` (una sección por chunk es lo predeterminado) y confirma que cada respuesta lleve su cita de `source` y `section`. Verifica que los pasajes rerankeados sean realmente los relevantes.
- **Structured:** haz que las respuestas sean demostrablemente correctas. Afina la descripción en `src/query/schema.ts` (significado de los campos, unidades, valores de los enums) para que el modelo escriba buenos pipelines. Tus datos sintéticos deben ser internamente consistentes: el registro que llamas "el más grande de este mes" debe serlo de verdad, y los totales deben cuadrar. La herramienta devuelve los registros, una explicación en lenguaje natural y el pipeline que ejecutó; usa la explicación para confirmar que la consulta hace lo que esperas.
- **Híbrido:** logra que ambas vías aporten y se reconcilien en una sola respuesta. Usa `assess` como plantilla para fusionar la búsqueda de un registro con el texto recuperado.

**Constrúyelo con Claude Code:** [`prompts/es/phase-2-retrieval-and-query.md`](./prompts/es/phase-2-retrieval-and-query.md)

**Puerta del Checkpoint 2:** la recuperación devuelve pasajes rerankeados, relevantes y citados; `structured_query` devuelve los registros correctos para tus preguntas de muestra junto con su explicación; el híbrido muestra ambas vías aportando.

**Verifica:** ejecuta `npm run verify` (adapta las verificaciones de `scripts/verify.ts` a las respuestas conocidas y correctas de tus datos) y revisa a mano algunas preguntas de muestra con `npm run dev`.

---

## Fase 3: Completa tu agente (Checkpoint 3)

**Objetivo:** tus dos o tres herramientas de negocio funcionando, memoria que mejore la experiencia y un escenario de demo corriendo de punta a punta.

**Qué vas a editar:** nuevos archivos bajo `src/tools/`, `src/tools/registry.ts`, `src/patterns.ts`, `src/agent/prompts/`, y opcionalmente `src/tools/memoryTools.ts`.

**Pasos**

1. **Agrega tus herramientas de negocio.** Copia `src/tools/exampleBusinessTool.ts` por cada herramienta nueva, dale un `name`, una `description` y un `schema` de zod claros, e implementa la lógica (usa `getDb()`, `getChatModel()`, `retrievePassages()` según necesites). Registra cada una en `src/tools/registry.ts` y agrégala a tu patrón en `src/patterns.ts`. Quédate en dos o tres herramientas simples; la `description` es como el modelo decide cuándo llamarla, así que sé concreto.
2. **Conecta la memoria.** La memoria de corto plazo ya funciona: el mismo `--thread` retoma la conversación. Para memoria de largo plazo que cruce conversaciones, usa la herramienta `remember` y decide qué vale la pena guardar sobre un usuario (su equipo, rol, preferencias, o ids de registros que le importan). Sigue la disciplina de referencias: guarda referencias y contexto liviano, nunca el contenido crudo de los registros. El mismo `--user` con un `--thread` nuevo debería arrastrar ese contexto.
3. **Afina el prompt** en `src/agent/prompts/` (edita `es.ts` si presentas en español) para que la persona y las instrucciones del agente encajen con tus usuarios. Traduce solo la prosa: los nombres de herramientas, las claves JSON y los tokens `CONSISTENT` / `INCONSISTENT` / `NEEDS REVIEW` quedan en inglés.
4. **Corre tu escenario de demo** de punta a punta con `npm run dev`, exactamente como lo vas a mostrar.

**Constrúyelo con Claude Code:** [`prompts/es/phase-3-tools-and-memory.md`](./prompts/es/phase-3-tools-and-memory.md)

**Puerta del Checkpoint 3:** al menos dos herramientas funcionando, memoria persistiendo entre sesiones (el mismo `thread_id` retoma; el mismo `user_id` recuerda entre hilos) y un escenario de demo corriendo de punta a punta.

**Verifica:** `npm run typecheck` limpio, `npm run verify` pasando contra tus datos, y tu escenario de demo corriendo sin tropiezos desde cero.

---

## Preparación de la demo y showcase

Mantén tu presentación del PoC al día después de cada checkpoint; no la dejes para el final. Tu showcase es una **demo en vivo de 5 minutos** contra los criterios de éxito de tu concepto aprobado, más 2 minutos de preguntas.

Una buena demo:

- Corre el agente real en vivo (`npm run dev`), no diapositivas con capturas de pantalla.
- Muestra tu patrón haciendo lo que prometía tu concepto, con citas o números correctos en pantalla.
- Demuestra memoria: una pregunta de seguimiento en el mismo hilo, o una sesión nueva que sigue conociendo al usuario.
- Enuncia el valor de negocio en una línea (la métrica a la que apuntaba tu concepto).

---

## Referencia rápida

**Comandos**

```bash
npm run typecheck   # los tipos están limpios
npm run load        # (re)carga tu KB + datos estructurados y construye el índice vectorial
npm run verify      # corre las verificaciones de los checkpoints contra tus datos
npm run dev -- --pattern <rag|structured|hybrid> --thread <id> --user <id> "pregunta"
```

**Solución de problemas**

- **`401` en el paso de credenciales:** tu passkey expiró. Vuelve a ejecutar el script setup-keys para escribir uno nuevo en `.env`.
- **La invocación de Bedrock falla por región o modelo:** prueba `BEDROCK_REGION=us-east-1` en `.env`; el perfil global del modelo enruta entre regiones.
- **La búsqueda vectorial no devuelve nada justo después de la carga:** el índice todavía se está construyendo. `npm run load` lo espera, pero si creaste los datos por otra vía, dale un minuto al índice.
- **`403` de Voyage, "This API key cannot access this endpoint":** la llave y el host son de familias distintas. El passkey genera una llave de modelo de Atlas (`al-...`), que solo funciona contra `https://ai.mongodb.com/v1`, el valor por defecto de `VOYAGE_API_BASE` en el scaffold. Ponlo en `https://api.voyageai.com/v1` solo si trajiste tu propia llave de Voyage (`pa-...`).
- **Error de dimensión del embedding:** `VOYAGE_EMBEDDING_DIMENSIONS` debe coincidir con tu `VOYAGE_EMBEDDING_MODEL`. Si cambias el modelo, vuelve a cargar para que el índice se reconstruya con la dimensión correcta.
- **El agente responde en el idioma equivocado:** revisa `AGENT_LANGUAGE` en `.env`. Recuerda que los tokens de veredicto siguen en inglés a propósito, incluso cuando el agente responde en español.
- **Postura de la herramienta de consulta:** la herramienta de consulta está orientada a lectura, con un tope de resultados y un timeout para que la demo fluya. Construir una verdadera imposición de solo lectura y sus guardrails es un tema de productización (ver `README.md`); no es requisito para los checkpoints.

Para más detalle sobre la arquitectura, las variables de entorno y el modelo de datos, ver [`README.md`](./README.md).
