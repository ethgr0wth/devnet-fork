/**
 * portal-drag — position math + persistence for the draggable portal bar.
 *
 * The bar is fixed-position; the user drags it anywhere and the spot sticks
 * across sessions. Pure so the clamp (keep it on-screen) is unit-tested.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface BarSize {
  width: number;
  height: number;
}

export const PORTAL_POS_KEY = "devnet-portal-pos";
const MARGIN = 8;

/**
 * Clamp a desired top-left so the bar stays fully on-screen with a margin.
 * Degrades gracefully when the bar is larger than the viewport (pins to the
 * top-left margin rather than pushing off the far edge).
 */
export function clampPosition(desired: Point, bar: BarSize, vp: Viewport): Point {
  const maxX = Math.max(MARGIN, vp.width - bar.width - MARGIN);
  const maxY = Math.max(MARGIN, vp.height - bar.height - MARGIN);
  return {
    x: Math.min(Math.max(desired.x, MARGIN), maxX),
    y: Math.min(Math.max(desired.y, MARGIN), maxY),
  };
}

export function loadPortalPos(): Point | null {
  try {
    const raw = localStorage.getItem(PORTAL_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return { x: p.x, y: p.y };
  } catch {
    /* ignore */
  }
  return null;
}

export function savePortalPos(p: Point): void {
  try {
    localStorage.setItem(PORTAL_POS_KEY, JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y) }));
  } catch {
    /* private mode */
  }
}
