# Prompts de la Fase 2: Recuperación y consulta inteligentes (Checkpoint 2)

Objetivo: resultados correctos y respaldados por evidencia para tus preguntas de muestra. Ver [`../../HOW-TO-USE.es.md`](../../HOW-TO-USE.es.md#fase-2-recuperación-y-consulta-inteligentes-checkpoint-2).

Usa los prompts de tu patrón. Verifica con `npm run verify` y con revisiones puntuales vía `npm run dev`.

---

## Prompt (RAG): mejorar la calidad de la recuperación

```
Nuestras respuestas RAG están [DESCRIBE EL PROBLEMA: no encuentran el pasaje correcto /
citan la sección equivocada / son demasiado genéricas]. Ayúdame a mejorar la calidad de la
recuperación:
1. Revisa el chunking en data/load.ts para nuestros documentos y sugiere una división
   mejor si las secciones son demasiado grandes o demasiado pequeñas.
2. Sugiere valores para RETRIEVAL_TOP_K y RERANK_TOP_K según el tamaño de nuestro corpus y
   explica el compromiso entre ambos.
3. Confirma que cada pasaje devuelto conserva su cita de source y section, y que el orden
   tras el reranking pone primero el pasaje más relevante para estas preguntas:
   [LISTA 2-3 PREGUNTAS DE MUESTRA].
4. Antes de seguir afinando números, dime si otra capacidad de Voyage resolvería esto de
   raíz: embeddings contextualizados (voyage-context-4) si los pasajes que fallan dependen
   de contexto que está fuera de su propio chunk, un modelo de dominio (voyage-code-3,
   voyage-law-2, voyage-finance-2) si nuestro vocabulario es especializado, rerank-2.5 con
   una instrucción si el orden queda cerca pero mal, o rerank-2.5-lite si el reranking es
   nuestro costo de latencia. Dime cuál elegirías para nuestro corpus y por qué.
Haz un cambio a la vez, y vuelve a ejecutar npm run load solo si cambió el chunking.
```

## Prompt (structured): lograr consultas verificablemente correctas

```
Ayúdame a que structured_query sea correcto para estas preguntas de muestra:
[LISTA 3-5 PREGUNTAS DE MUESTRA CON LA RESPUESTA QUE ESPERAS].

1. Mejora la descripción en src/query/schema.ts para que el modelo produzca de forma
   confiable la agregación correcta (aclara el significado de los campos, las unidades, los
   valores de los enums y cómo manejar fechas). Mantén esa descripción en inglés.
2. Para cada pregunta, ejecútala con npm run dev y revisa los registros devueltos, la
   explicación en lenguaje natural y el pipeline. Si una consulta sale mal, dime si el
   arreglo va en la descripción del esquema o en los datos.
3. Confirma que nuestros datos sintéticos son internamente consistentes con esas respuestas.
No agregues validación ni allowlists a la herramienta de consulta; mantenla simple según
CLAUDE.md.
```

## Prompt (híbrido): que ambas vías aporten

```
Para nuestro caso de uso híbrido quiero una sola respuesta que use tanto la política
recuperada como una consulta estructurada, como hace la herramienta assess. Usando
src/hybrid/hybridTool.ts como plantilla, ayúdame a asegurar que para [TU ESCENARIO DE
MUESTRA] el agente (a) traiga el registro correcto, (b) recupere los pasajes de política
relevantes y (c) los reconcilie en una respuesta fundamentada y citada. Muéstrame en qué
punto entra el resultado de cada vía al prompt final. Si adaptas los prompts de assess,
edita src/hybrid/prompts/en.ts o src/hybrid/prompts/es.ts y mantén el veredicto final como
uno de los tokens en inglés CONSISTENT, INCONSISTENT o NEEDS REVIEW.
```

## Prompt: adaptar las verificaciones

```
Actualiza scripts/verify.ts para que el Checkpoint 2 revise nuestros datos en lugar de los
de ejemplo: que la recuperación devuelva un pasaje citado y relevante para [PREGUNTA]; que
structured_query devuelva los registros correctos para [PREGUNTA] junto con una
explicación; y (si es híbrido) que ambas vías aporten. Basa los valores esperados en las
expectations que exporta nuestro generador, no en suposiciones escritas a mano. Ejecuta
npm run verify y reporta qué pasa.
```

## Ideas para probar en esta fase

- Agrega un par de documentos o registros "casi correctos" para que la recuperación y las consultas tengan que discriminar, no solo devolver la única coincidencia.
- Para agentes estructurados, prueba una agregación (un conteo, una suma, un ranking), no solo una búsqueda puntual.
- Anota cualquier pregunta que todavía falle: es buena candidata para una herramienta dedicada en la Fase 3.
