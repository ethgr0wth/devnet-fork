/**
 * portalSession — the Prompt Portal's SYSTEM playground session.
 *
 * Ground truth (aias march_2026, read from source):
 * - api/routes/playground.py: POST/GET `/api/playground/sessions`,
 *   PATCH `/api/playground/sessions/{id}` ("Update playground session
 *   configuration (model, temperature, etc.)").
 * - api/models/schemas.py PlaygroundSessionCreate: `model_provider`
 *   (ProviderType), `model_name`, `ttl_hours: int = 24`, `persona`, …
 *   PlaygroundSessionUpdate: `model_provider?`, `model_name?`, …
 * - api/services/redis_storage.create_playground_session:
 *       ttl_seconds = ttl_hours * 3600 if ttl_hours > 0 else 0
 *       expires_at  = ""              when ttl_hours <= 0
 *   → `ttl_hours: 0` IS the no-expiration session. That is what makes
 *   the portal session a system session: created once, never expires,
 *   adopted on every visit.
 *
 * Model flow (the spec): the session is created lazily on the first
 * successful prompt WITH the user's selected model; adjusting the model
 * afterwards PATCHes the same session.
 */

export const PORTAL_SESSION_NAME = "AiAS Portal";

export const PORTAL_SESSION_PERSONA =
  "AiAS Portal — the authenticated conversational entry point for the operator's platform.";

/**
 * ProviderType enum values that can bind a playground session
 * (api/models/schemas.py ProviderType, minus `tavily` which is the
 * search provider). PIN models ride a different route and cannot be a
 * playground session's model_provider.
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

export function findPortalSession(sessions: unknown): any | undefined {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.find(
    (s: any) => s && s.name === PORTAL_SESSION_NAME && s.status !== "expired"
  );
}

export function buildPortalSessionCreateBody(sel: PortalModelSelection) {
  return {
    name: PORTAL_SESSION_NAME,
    persona: PORTAL_SESSION_PERSONA,
    model_provider: sel.provider,
    model_name: sel.model,
    // redis_storage: ttl_hours <= 0 → no Redis TTL, expires_at "" — the
    // system session never expires.
    ttl_hours: 0,
  };
}

export function buildPortalModelPatchBody(sel: PortalModelSelection) {
  return { model_provider: sel.provider, model_name: sel.model };
}

export interface EnsuredPortalSession {
  id: string;
  created: boolean;
  messages: any[];
}

/**
 * Idempotent bootstrap: adopt the existing system session when present
 * (by name, non-expired), otherwise create it — carrying the user's
 * selected model.
 */
export async function ensurePortalSession(
  client: AiasJsonClient,
  sel: PortalModelSelection
): Promise<EnsuredPortalSession> {
  const listed = await client.json<any[]>("/api/playground/sessions");
  const existing = findPortalSession(listed.data);
  if (existing?.id) {
    return {
      id: existing.id,
      created: false,
      messages: Array.isArray(existing.messages) ? existing.messages : [],
    };
  }
  const created = await client.json<any>("/api/playground/sessions", {
    method: "POST",
    body: JSON.stringify(buildPortalSessionCreateBody(sel)),
  });
  if (!created.ok || !created.data?.id) {
    throw new Error(created.data?.detail || "Could not create portal chat session");
  }
  return { id: created.data.id, created: true, messages: [] };
}

/** PATCH the system session's model when the user adjusts the picker. */
export async function updatePortalSessionModel(
  client: AiasJsonClient,
  sessionId: string,
  sel: PortalModelSelection
): Promise<boolean> {
  const res = await client.json(`/api/playground/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(buildPortalModelPatchBody(sel)),
  });
  return res.ok;
}
