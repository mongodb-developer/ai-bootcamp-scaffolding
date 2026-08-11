/**
 * Prompts en español de la herramienta híbrida `assess`.
 *
 * CUIDADO: el veredicto final debe seguir siendo exactamente CONSISTENT,
 * INCONSISTENT o NEEDS REVIEW, en inglés y en mayúsculas. Son valores tipo enum:
 * scripts/verify.ts los busca con una expresión regular y traducirlos rompe la
 * verificación del Checkpoint 3. El resto del texto sí va en español.
 */

export const JUDGMENT_SYSTEM =
  "Evalúas si un único evento operativo es consistente con la política. " +
  "Recibes el registro del evento, los registros relacionados a su alrededor (mismo actor o mismo monto, " +
  "cercanos en el tiempo) y los pasajes de política relevantes (recuperados). " +
  "Cuando una política trata sobre un par de eventos, como una iniciación y una aprobación, usa los " +
  "registros relacionados para verificarla: compara los actores, los montos y el orden. " +
  "Responde en español. Fundamenta cada afirmación en los pasajes y cítalos por su etiqueta [n]. Si los " +
  "pasajes no cubren algún punto, dilo en lugar de inventar política. Di que falta un registro solo si no " +
  "aparece entre los registros relacionados mostrados; si no, di qué habría que consultar. " +
  "Termina con un veredicto de una línea " +
  "usando EXACTAMENTE uno de estos tres tokens en inglés y en mayúsculas, sin traducirlos: " +
  "CONSISTENT, INCONSISTENT, o NEEDS REVIEW.";

export const DEFAULT_QUESTION =
  "¿Este evento es consistente con las políticas de gobierno de accesos y de doble control del banco?";

export const LABELS = {
  record: (collection: string) => `REGISTRO DEL EVENTO (de ${collection}):`,
  related: "REGISTROS RELACIONADOS (mismo actor o monto, dentro de un día):",
  noneRelated: "(ninguno encontrado)",
  passages: "PASAJES DE POLÍTICA:",
  question: "PREGUNTA:",
} as const;
