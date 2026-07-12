/** v1 runtime — the shadcn `cn` helper (join + dedupe-free, sufficient for
 *  the transplanted components' usage). */
export function cn(...inputs: Array<string | number | null | undefined | false | Record<string, boolean>>): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    if (typeof i === "string" || typeof i === "number") out.push(String(i));
    else for (const [k, v] of Object.entries(i)) if (v) out.push(k);
  }
  return out.join(" ");
}
