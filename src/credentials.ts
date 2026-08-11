import { config as loadEnv } from "dotenv";

/**
 * Credential bootstrap.
 *
 * The chat model (Bedrock) and Voyage embeddings both need secrets that we do
 * NOT bake into the image or write to disk. Instead we mint them per process
 * from the DevDay credentials Lambda using its `get_token` task, and place them
 * into process.env in memory only. Nothing is persisted.
 *
 * We use ONLY the Lambda's get_token task. The Lambda's `completion` task is
 * never called by this scaffold.
 *
 * See .assets/LAMBDA_USAGE.md for the full contract. Request:
 *   POST { "task": "get_token", "data": { "passkey": "...", "provider": "aws|voyageai" } }
 * Response 200: { "token": { KEY_NAME: value, ... } }  (see envelope handling below)
 *
 * Design note: if a provider's keys are already present in the environment
 * (e.g. a developer exported their own, or a prior call in this process already
 * minted them), we skip that provider. This keeps the bootstrap idempotent and
 * lets someone bypass the passkey entirely by supplying their own keys. The
 * same rule applies per key: whatever is already in the environment wins, so
 * the bootstrap can never silently overwrite a value that came from .env.
 */

loadEnv({ quiet: true });

/** Providers this scaffold knows how to mint, and the env keys each returns. */
const PROVIDER_KEYS = {
  aws: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  voyageai: ["VOYAGE_API_KEY"],
} as const;

export type CredentialProvider = keyof typeof PROVIDER_KEYS;

const DEFAULT_LAMBDA_URL =
  "https://vtqjvgchmwcjwsrela2oyhlegu0hwqnw.lambda-url.us-west-2.on.aws/";

let bootstrapped = false;

/**
 * Fetch and set the credentials the app needs, once per process.
 *
 * @param providers Which providers to mint. Defaults to both aws and voyageai.
 */
export async function bootstrapCredentials(
  providers: CredentialProvider[] = ["aws", "voyageai"],
): Promise<void> {
  if (bootstrapped) return;

  const missing = providers.filter((p) => !providerSatisfied(p));
  if (missing.length === 0) {
    bootstrapped = true;
    return;
  }

  const passkey = process.env.PASSKEY?.trim();
  if (!passkey) {
    throw new Error(
      `Missing credentials for [${missing.join(", ")}] and no PASSKEY set. ` +
        `Set PASSKEY (announced by the presenter) so the credential bootstrap can mint them, ` +
        `or export the keys yourself to bypass the Lambda.`,
    );
  }

  const url = process.env.LAMBDA_CREDENTIALS_URL?.trim() || DEFAULT_LAMBDA_URL;

  const skipped: string[] = [];
  for (const provider of missing) {
    const token = await fetchToken(url, passkey, provider);

    // Fill gaps only. The bootstrap exists to supply what the environment is
    // missing, so an existing value always wins: a key you exported yourself,
    // and any config the Lambda may return alongside the credentials, which
    // would otherwise silently override .env at runtime.
    for (const [key, value] of Object.entries(token)) {
      if (process.env[key]?.trim()) {
        skipped.push(key);
        continue;
      }
      process.env[key] = value;
    }
  }

  // One line, no key names and never any values. The exception is worth saying
  // out loud: a key the environment already held, which the Lambda did not
  // replace, is the kind of thing that makes a stale credential look like a bug.
  console.error("Credentials minted.");
  if (skipped.length > 0) {
    console.error(`Kept existing ${skipped.join(", ")} from the environment.`);
  }

  bootstrapped = true;
}

/** True when every env key a provider supplies is already populated. */
function providerSatisfied(provider: CredentialProvider): boolean {
  return PROVIDER_KEYS[provider].every((k) => Boolean(process.env[k]?.trim()));
}

/** POST get_token and return the flat token object of key/value strings. */
async function fetchToken(
  url: string,
  passkey: string,
  provider: CredentialProvider,
): Promise<Record<string, string>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "get_token", data: { passkey, provider } }),
    });
  } catch (cause) {
    throw new Error(`Could not reach the credential Lambda at ${url}.`, { cause });
  }

  const raw = await res.text();
  const parsed = safeJsonParse(raw);

  if (!res.ok) {
    const message = extractError(parsed) ?? `HTTP ${res.status}`;
    const hint = res.status === 401 ? " (passkey missing/expired: get a fresh one)" : "";
    throw new Error(`Credential Lambda rejected provider "${provider}": ${message}${hint}`);
  }

  const token = extractToken(parsed);
  if (!token) {
    throw new Error(`Credential Lambda returned no token for provider "${provider}".`);
  }
  return token;
}

/**
 * Pull the token object out of the response, tolerating the envelope variants
 * described in LAMBDA_USAGE.md: the body may be the payload directly
 * ({ token: {...} }) or a Lambda-proxy wrapper ({ body: "..." | {...} }).
 */
function extractToken(parsed: unknown): Record<string, string> | null {
  if (!isRecord(parsed)) return null;

  if (isRecord(parsed.token)) return stringifyValues(parsed.token);

  if ("body" in parsed) {
    const inner = typeof parsed.body === "string" ? safeJsonParse(parsed.body) : parsed.body;
    if (isRecord(inner) && isRecord(inner.token)) return stringifyValues(inner.token);
  }
  return null;
}

function extractError(parsed: unknown): string | null {
  if (isRecord(parsed) && typeof parsed.error === "string") return parsed.error;
  if (isRecord(parsed) && "body" in parsed) {
    const inner = typeof parsed.body === "string" ? safeJsonParse(parsed.body) : parsed.body;
    if (isRecord(inner) && typeof inner.error === "string") return inner.error;
  }
  return null;
}

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = String(v);
  return out;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
