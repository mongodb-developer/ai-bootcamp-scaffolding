# Datos mock a partir de tu esquema y tus muestras

Esta carpeta es la vía **predeterminada** para que los equipos de consulta estructurada e híbridos preparen sus datos para el bootcamp. En lugar de exportar registros reales, describes aquí el **esquema** de tu colección y escribes a mano **unos pocos registros representativos**; luego un prompt de Claude Code los expande en un dataset mock completo e internamente consistente para el evento. Exporta y carga un dataset real solo si ya tienes uno sintético y aprobado en mano.

*(English version: [`README.md`](./README.md))*

## Por qué existe esta vía

Las reglas de Data Compliance del bootcamp son estrictas, y con razón: nada de PII de clientes, nada de datos reales de transacciones, nada de datasets regulados, aprobación del data owner antes de que algo salga de su sistema de origen, un paso de clasificación, y cualquier revisión de seguridad o compliance terminada una semana antes del evento. Para un agente de consulta estructurada o híbrido, pasar por todo eso solo para conseguir un dataset de demo suele ser el mayor cuello de botella en la antesala del evento.

No necesitas datos reales para construir una demo convincente de consulta estructurada. Necesitas un **esquema** fiel y datos **internamente consistentes**, para que las respuestas del agente sean verificables. Como escribes las muestras a mano desde tu conocimiento de la forma de los datos, nada real sale nunca de su sistema de origen. No hay exportación, así que no hay aprobación del data owner, ni clasificación, ni revisión de seguridad en la ruta crítica. Y sigues bien dentro de las reglas duras: los datos son sintéticos y de uso interno.

## Cómo funciona (todo es copiar y pegar, no hay nada que subir)

Tu workspace de Instruqt ya contiene esta carpeta. Nunca subes archivos al entorno; completas estas plantillas en el sitio (pegando tu contenido en ellas desde el editor, o pegándolo directamente en el prompt de Claude Code) y luego ejecutas el prompt.

1. Abre `collection.md` y complétalo: el nombre de tu colección, los campos y sus tipos, los valores de los enums, las unidades, las reglas de consistencia, los **hechos verificables** que tu demo debe responder correctamente, y de 3 a 5 registros de muestra escritos a mano.
2. Abre [`../../prompts/es/phase-1-foundation.md`](../../prompts/es/phase-1-foundation.md), busca **"Opción A: generar datos mock a partir de tu esquema y tus muestras"** y pega ese prompt en Claude Code.
3. Claude Code reescribe `data/sample/activity_events.ts` como un generador determinista y auto-verificado para **tu** colección, y actualiza la descripción del esquema en `src/query/schema.ts` (esa descripción se mantiene en inglés a propósito: es una ayuda de prompt llena de nombres de campo).
4. Ejecuta `npm run typecheck` y luego `npm run load`. El generador valida su propia consistencia interna antes de insertar cualquier dato, así que un dataset malo falla ruidosamente en vez de producir respuestas incorrectas en la demo.

## Qué significa "internamente consistente"

Las respuestas estructuradas tienen una vara de corrección muy afilada: si tu agente va a responder "el pedido más grande de este trimestre", un registro debe ser realmente el más grande, y los totales que reporte deben cuadrar. El generador que produce el prompt incorpora esto sembrando **registros ancla** (tus superlativos y casos borde etiquetados) y validando que los hechos se cumplan antes de que la carga siga. Por eso `collection.md` te pide listar los hechos verificables desde el inicio: se convierten en las aserciones.

El escenario bancario que viene en `data/sample/activity_events.ts` es la referencia que el prompt copia. Déjalo en su sitio; es a la vez la plantilla y el plan B si tu insumo no está listo.
