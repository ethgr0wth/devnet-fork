/**
 * ecosystem-landing — deterministic choice of the classic surface's active
 * ecosystem.
 *
 * The old behavior was `userEcosystems[0]` over a Redis SMEMBERS payload —
 * unordered, so the DevOne migration catch-all usually won and the
 * workspaces deep link landed on remnants instead of the user's bridged
 * AiAS environment.
 *
 * Preference order:
 *   1. the user's persisted explicit choice (ecosystem switcher)
 *   2. the freshest `origin === "aias_v1"` twin (the bridge stamps
 *      origin_synced_at on every pass)
 *   3. first entry (DevOne et al. become the fallback, not the default)
 */

export const ACTIVE_ECOSYSTEM_KEY = "devnet-active-ecosystem";

export interface EcosystemLike {
  id: string;
  origin?: string;
  origin_synced_at?: string;
  [k: string]: unknown;
}

export function pickLandingEcosystem<T extends EcosystemLike>(
  list: T[],
  persistedId?: string | null
): T | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (persistedId) {
    const chosen = list.find((e) => e && e.id === persistedId);
    if (chosen) return chosen;
  }
  const twins = list
    .filter((e) => e && e.origin === "aias_v1")
    .sort((a, b) =>
      String(b.origin_synced_at || "").localeCompare(String(a.origin_synced_at || ""))
    );
  if (twins.length > 0) return twins[0];
  return list[0];
}
