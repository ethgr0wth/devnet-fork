/**
 * portalBus — the single-prompt command bus.
 *
 * The vision (Mark, 2026-07-14): the portal prompt bar is THE ONLY prompt.
 * Apps stop shipping their own input fields; when an app is the front
 * surface it REGISTERS a target here, and the portal bar routes the user's
 * text to that target instead of the portal's own playground chat.
 *
 * Module-level singleton (same JS realm as every app window in the AiOS
 * island) so no event serialization is needed — an app hands the bar a live
 * `submit` closure that already closes over its session/mode/model state.
 *
 * Pure and framework-free: React just subscribes.
 */

export interface PortalTarget {
  /** App id that owns the prompt right now (e.g. "keystone"). */
  appId: string;
  /** Short human label shown on the bar ("KeyStone"). */
  label: string;
  /** Placeholder for the bar's input while this target is active. */
  placeholder?: string;
  /** Receives the submitted prompt text. */
  submit: (prompt: string) => void | Promise<void>;
}

let target: PortalTarget | null = null;
let barMounted = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/** App registers itself as the active prompt target; returns an unregister. */
export function registerPortalTarget(t: PortalTarget): () => void {
  target = t;
  notify();
  return () => {
    if (target === t) {
      target = null;
      notify();
    }
  };
}

export function getPortalTarget(): PortalTarget | null {
  return target;
}

/**
 * The portal bar calls this on mount/unmount. Apps read it to decide whether
 * to hide their own input: only surrender the input when a real bar is here
 * to receive it (so QW still works if ever rendered outside AiOS).
 */
export function setPortalBarMounted(mounted: boolean): void {
  if (barMounted !== mounted) {
    barMounted = mounted;
    notify();
  }
}

export function isPortalBarMounted(): boolean {
  return barMounted;
}

export function subscribePortalBus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Test-only reset. */
export function __resetPortalBus(): void {
  target = null;
  barMounted = false;
  listeners.clear();
}
