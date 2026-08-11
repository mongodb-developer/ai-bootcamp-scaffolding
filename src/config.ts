import { config as loadEnv } from "dotenv";
import { z } from "zod";

/**
 * Single source of configuration. Every setting comes from an environment
 * variable, validated once here with zod. No other module reads process.env
 * for app config.
 *
 * Note on ordering: the AWS_* and VOYAGE_API_KEY values are minted at runtime
 * by src/credentials.ts and placed into process.env before getConfig() is
 * first called. That is why config is resolved lazily (on first call) rather
 * than at import time: the credential bootstrap must run first.
 */

// quiet: dotenv's default banner prints on every run, twice (credentials.ts
// loads too), and says nothing a participant needs.
loadEnv({ quiet: true });

const booleanish = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.enum(["true", "false", "1", "0", "yes", "no", ""]))
  .transform((v) => v === "true" || v === "1" || v === "yes");

const LanguageSchema = z.enum(["en", "es"]).default("en");

const ConfigSchema = z.object({
  // MongoDB Atlas
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("buildrel"),
  KB_COLLECTION: z.string().min(1).default("kb_documents"),
  EVENTS_COLLECTION: z.string().min(1).default("activity_events"),
  VECTOR_INDEX_NAME: z.string().min(1).default("vector_index"),

  // Presentation language. Selects which set of agent prompts is loaded
  // (src/agent/prompts/), and therefore the language the agent answers in and
  // the language of its query explanations and hybrid judgments. It never
  // changes the JSON contracts or the verdict tokens, which stay English.
  // Defaults to "en" here and in env.example; a Spanish delivery sets "es".
  AGENT_LANGUAGE: LanguageSchema,

  // Long-term memory store (cross-thread, keyed by user). Distinct from the
  // per-thread checkpointer. MEMORY_TTL_SECONDS = 0 disables expiry.
  MEMORY_COLLECTION: z.string().min(1).default("agent_memory"),
  MEMORY_TTL_SECONDS: z.coerce.number().int().nonnegative().default(0),

  // Bedrock chat model. Credentials come from the SigV4 default chain, which
  // reads the AWS_* vars that credentials.ts sets in process.env.
  BEDROCK_REGION: z.string().min(1).default("us-west-2"),
  BEDROCK_MODEL_ID: z.string().min(1).default("global.anthropic.claude-sonnet-4-6"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID missing: run the credential bootstrap or set it manually"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY missing: run the credential bootstrap or set it manually"),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(4096),

  // Voyage embeddings + reranking
  VOYAGE_API_KEY: z.string().min(1, "VOYAGE_API_KEY missing: run the credential bootstrap or set it manually"),
  // Two key families, two hosts. The bootcamp's credential Lambda mints an
  // Atlas model API key ("al-..."), which only authenticates against
  // ai.mongodb.com. A key created directly with Voyage ("pa-...") only
  // authenticates against api.voyageai.com; set VOYAGE_API_BASE to
  // https://api.voyageai.com/v1 if you bring your own Voyage key.
  VOYAGE_API_BASE: z.string().url().default("https://ai.mongodb.com/v1"),
  VOYAGE_EMBEDDING_MODEL: z.string().min(1).default("voyage-4-large"),
  VOYAGE_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
  VOYAGE_RERANK_MODEL: z.string().min(1).default("rerank-2.5"),

  // Retrieval tuning
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(10),
  RERANK_TOP_K: z.coerce.number().int().positive().default(4),

  // Structured query tool (demo ergonomics only, not a security control)
  QUERY_RESULT_CAP: z.coerce.number().int().positive().default(50),
  QUERY_MAX_TIME_MS: z.coerce.number().int().positive().default(5000),
  REJECT_WRITE_STAGES: booleanish.default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

let cached: Config | null = null;

/**
 * Validate and return the configuration. Cached after the first call so
 * validation runs exactly once. Call bootstrapCredentials() before this.
 */
export function getConfig(): Config {
  if (cached) return cached;

  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration. Fix these environment variables:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Resolve AGENT_LANGUAGE alone, without validating the rest of the config.
 *
 * The three localised prompt folders select their language at module scope, and
 * module bodies run at import time, before main() can await
 * bootstrapCredentials(). Calling getConfig() there would validate AWS_* and
 * VOYAGE_API_KEY while they are still unminted and crash on startup. Picking a
 * language needs no credentials, so it gets its own narrow read.
 */
export function getLanguage(): Config["AGENT_LANGUAGE"] {
  const parsed = LanguageSchema.safeParse(process.env.AGENT_LANGUAGE);
  if (!parsed.success) {
    throw new Error(`Invalid AGENT_LANGUAGE: expected "en" or "es".`);
  }
  return parsed.data;
}
