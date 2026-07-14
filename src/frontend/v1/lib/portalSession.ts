/**
 * portalSession — the Prompt Portal's per-model SYSTEM playground sessions.
 *
 * v2 (Mark's spec): a model → session map. Every model keeps its OWN
 * never-expiring session; switching models adopts that model's session and
 * continues the conversation. Nothing is PATCHed in place and nothing is
 * created just by switching — sessions are created lazily on the first
 * successful prompt for that model.
 *
 * The durable map is the SERVER: playground sessions carry `model_name`
 * (api/models/schemas.py PlaygroundSession), so discovery is
 * list-and-match — consistent across reloads and devices. The component
 * keeps an in-memory map only as a fast path.
 *
 * Ground truth (aias march_2026, read from source):
 * - api/routes/playground.py: POST/GET `/api/playground/sessions`
 * - api/models/schemas.py PlaygroundSessionCreate: `model_provider`
 *   (ProviderType), `model_name`, `ttl_hours: int = 24`, `persona`, …
 * - api/services/redis_storage.create_playground_session:
 *       ttl_seconds = ttl_hours * 3600 if ttl_hours > 0 else 0
 *       expires_at  = ""              when ttl_hours <= 0
 *   → `ttl_hours: 0` IS the no-expiration session.
 */

export const PORTAL_SESSION_NAME = "AiAS Portal";

export const PORTAL_SESSION_PERSONA =
  "AiAS Portal — the authenticated conversational entry point for the operator's platform.";

/** Per-model session name — readable in the playground UI, greppable. */
export function portalSessionNameFor(model: string): string {
  return `${PORTAL_SESSION_NAME} — ${model}`;
}

/**
 * ProviderType enum values that can bind a playground session
 * (api/models/schemas.py ProviderType, minus `tavily` which is the search
 * provider). PIN models ride a different route and cannot be a playground
 * session's model_provider.
 */
export const PLAYGROUND_PROVIDERS = [
  "groq",
  "openai",
  "anthropic",
  "gemini",
  "mistral",
  "xai",
  "together",
  "openrouter",
  "deepseek",
  "fireworks",
  "perplexity",
] as const;

export interface PortalModelSelection {
  provider: string;
  model: string;
}

/** Minimal client contract — matched by the portal's `aias` bridge. */
export interface AiasJsonClient {
  json<T = unknown>(
    path: string,
    init?: RequestInit
  ): Promise<{ ok: boolean; status: number; data: T }>;
}

export function isPlaygroundProvider(id: string): boolean {
  return (PLAYGROUND_PROVIDERS as readonly string[]).includes(id);
}

/**
 * Find THIS model's portal session: non-expired, portal-named (per-model
 * name or the legacy exact "AiAS Portal"), model_name matching.
 */
export function findPortalSessionForModel(sessions: unknown, model: string): any | undefined {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.find(
    (s: any) =>
      s &&
      typeof s.name === "string" &&
      s.name.startsWith(PORTAL_SESSION_NAME) &&
      s.status !== "expired" &&
      s.model_name === model
  );
}

export function buildPortalSessionCreateBody(sel: PortalModelSelection) {
  return {
    name: portalSessionNameFor(sel.model),
    persona: PORTAL_SESSION_PERSONA,
    model_provider: sel.provider,
    model_name: sel.model,
    // redis_storage: ttl_hours <= 0 → no Redis TTL, expires_at "" — the
    // system session never expires.
    ttl_hours: 0,
  };
}

export interface AdoptedPortalSession {
  id: string;
  messages: any[];
}

/**
 * Adopt-only lookup for model switches: returns the model's existing
 * session (with its messages for hydration) or null. NEVER creates —
 * creation happens on the first successful prompt via ensurePortalSession.
 */
export async function adoptPortalSession(
  client: AiasJsonClient,
  model: string
): Promise<AdoptedPortalSession | null> {
  const listed = await client.json<any[]>("/api/playground/sessions");
  const existing = findPortalSessionForModel(listed.data, model);
  if (!existing?.id) return null;
  return {
    id: existing.id,
    messages: Array.isArray(existing.messages) ? existing.messages : [],
  };
}

export interface EnsuredPortalSession {
  id: string;
  created: boolean;
  messages: any[];
}

/**
 * Idempotent bootstrap for the CURRENT model: adopt its existing session
 * when present, otherwise create it — named and bound per-model, never
 * expiring.
 */
export async function ensurePortalSession(
  client: AiasJsonClient,
  sel: PortalModelSelection
): Promise<EnsuredPortalSession> {
  const adopted = await adoptPortalSession(client, sel.model);
  if (adopted) return { ...adopted, created: false };
  const created = await client.json<any>("/api/playground/sessions", {
    method: "POST",
    body: JSON.stringify(buildPortalSessionCreateBody(sel)),
  });
  if (!created.ok || !created.data?.id) {
    throw new Error(created.data?.detail || "Could not create portal chat session");
  }
  return { id: created.data.id, created: true, messages: [] };
}
