# Prompts de la Fase 0: Orientación

Objetivo: entender cómo está estructurado el scaffold y decidir dónde encaja tu agente antes de cambiar nada. Ver [`../../HOW-TO-USE.es.md`](../../HOW-TO-USE.es.md#fase-0-instalación-y-orientación).

Completa lo que está entre paréntesis y pega el prompt en Claude Code.

---

## Prompt: explícame la estructura

```
Lee context.md, CLAUDE.md y HOW-TO-USE.md. En unas diez líneas, explica cómo funciona este
scaffold de punta a punta: cómo fluye una pregunta desde la CLI, pasando por el agente de
LangGraph, las herramientas, la recuperación, la herramienta de consulta y la memoria.
Luego lista los archivos exactos que yo editaría para construir un agente
[rag | structured | hybrid], y los archivos que debo dejar sin modificar. No cambies código
todavía.
```

## Prompt: ubica mi agente

```
Nuestro caso de uso: [UNA O DOS FRASES: quiénes son los usuarios y qué problema resuelve
el agente]. El patrón que elegimos es [rag | structured | hybrid].

Con este scaffold, dime:
1. Si mi patrón encaja con el caso de uso, o si otro patrón encaja mejor y por qué.
2. Qué datos necesito tener listos (una base de conocimiento, una colección estructurada
   o ambas) y en qué archivos deben estar.
3. Las dos o tres herramientas de negocio que este agente probablemente necesitará,
   descritas en una línea cada una. No implementes nada todavía; quiero un plan para la
   Fase 1.
```

## Prompt: revisa mi entorno

```
Ayúdame a confirmar que mi entorno está listo sin exponer ningún secreto. Verifica que
.env tenga MONGODB_URI y PASSKEY configurados, ejecuta npm run typecheck y dime qué
corregir si algo falla. No imprimas el valor de ninguna variable de entorno.
```
