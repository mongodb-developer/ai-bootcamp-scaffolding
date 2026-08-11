# Prompts de la Fase 3: Herramientas, memoria y demo (Checkpoint 3)

Objetivo: tus dos o tres herramientas de negocio funcionando, memoria que mejore la experiencia y un escenario de demo de punta a punta. Ver [`../../HOW-TO-USE.es.md`](../../HOW-TO-USE.es.md#fase-3-completa-tu-agente-checkpoint-3).

---

## Prompt: agregar una herramienta de negocio

```
Quiero agregar una herramienta llamada [TOOL_NAME] que [QUÉ HACE Y CUÁNDO DEBERÍA USARLA
EL AGENTE]. Sus entradas son [CAMPOS Y TIPOS], y lee de [FUENTE DE DATOS: qué colección,
recuperación o cálculo].

Usando src/tools/exampleBusinessTool.ts como plantilla:
1. Crea src/tools/[toolName].ts con un nombre claro, una description escrita para ayudar al
   modelo a decidir cuándo llamarla, y un esquema zod con campos descritos.
2. Implementa la lógica usando getDb() / retrievePassages() / getChatModel() según haga
   falta. Manténla orientada a lectura.
3. Regístrala en src/tools/registry.ts y agrégala a mi patrón en src/patterns.ts.
Ejecuta npm run typecheck y luego pruébala con npm run dev sobre esta pregunta:
[PREGUNTA DE MUESTRA].
```

## Prompt: diseñar mis 2-3 herramientas en conjunto

```
Este es el trabajo de nuestro agente: [UNA O DOS FRASES]. Propón las dos o tres
herramientas que necesita (no más), cada una con un propósito de una línea, sus entradas y
su fuente de datos. Señala cualquiera que se solape con knowledge_base_search o
structured_query, que ya vienen incluidas, para reutilizar en vez de duplicar. Después las
implementamos una por una.
```

## Prompt: conectar la memoria de largo plazo

```
Quiero que el agente recuerde contexto útil sobre un usuario entre sesiones. Para nuestros
usuarios, lo que vale la pena recordar es [EJEMPLOS: su equipo, rol, región, o los ids de
los registros que está siguiendo].

1. Confirma cómo funcionan hoy la herramienta remember y src/memory/store.ts, y que el
   contexto recuperado se inyecta automáticamente en el prompt.
2. Ajusta la description y el esquema de la herramienta remember si nuestra memoria
   necesita otra forma, manteniendo la disciplina de referencias (guardar referencias y
   contexto liviano, nunca el contenido crudo de los registros ni datos personales
   sensibles).
3. Muéstrame cómo demostrarlo: guardar un dato en un hilo y luego recuperarlo desde un hilo
   nuevo con el mismo --user.
```

## Prompt: afinar la persona y el prompt

```
Afina el system prompt de nuestro agente [PATRÓN] para que le hable a [NUESTROS USUARIOS] y
siempre [COMPORTAMIENTO DESEADO: cite fuentes / diga qué consulta ejecutó / dé un
veredicto]. Edita el archivo del idioma en el que vamos a presentar: src/agent/prompts/es.ts
o src/agent/prompts/en.ts (AGENT_LANGUAGE en .env decide cuál se carga). Si cambias uno,
deja el otro equivalente. Traduce solo la prosa: los nombres de herramientas, las claves
JSON y los tokens de veredicto CONSISTENT / INCONSISTENT / NEEDS REVIEW quedan en inglés.
Manténlo conciso. Muéstrame el antes y el después.
```

## Prompt: ensayar el escenario de demo

```
Ayúdame a que nuestra demo del Checkpoint 3 y del showcase sea confiable. El escenario es:
[DESCRIBE LA DEMO: la o las preguntas que hace un usuario y cómo se ve una gran respuesta].
1. Córrelo de punta a punta con npm run dev desde cero y confirma que funciona.
2. Incluye un momento de memoria (un seguimiento en el mismo hilo, o un hilo nuevo que
   siga conociendo al usuario).
3. Señala cualquier cosa inestable y el arreglo más pequeño. Luego ejecuta npm run verify
   para confirmar que las verificaciones del checkpoint siguen pasando.
```

## Ideas para probar en esta fase

- Mantén dos o tres herramientas. Más herramientas hacen al agente más difícil de dirigir, no más inteligente.
- Dale a cada herramienta una description que diga tanto qué hace como cuándo preferirla sobre otra.
- Practica la demo de 5 minutos en voz alta; asegúrate de que en pantalla se vea una cita o un número correcto.
- Actualiza tu presentación del PoC ahora, mientras los resultados están frescos.
