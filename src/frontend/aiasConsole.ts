/**
 * aiasConsole.ts — operator console for BRIDGED communities (origin "aias_v1").
 *
 * A bridged community IS a v1 AiAS workspace (community id === workspace id).
 * The classic community room (app.ts openGroup) renders history via the
 * proxied GET /api/groups/{id}/messages; this module adds the v1 *operator*
 * controls on top of that, mirroring the v1 manager console
 * (aias web/src/v1_ported/pages/admin/Workspaces.tsx):
 *
 *   • mode switch  → PATCH /api/workspaces/{id}      {mode}         ai|shadow|takeover
 *   • human reply  → POST  /api/workspaces/{id}/admin-message {content}
 *   • shadow drafts→ GET   /api/workspaces/{id}/drafts
 *                    POST  /api/workspaces/drafts/{draftId}/approve {edited_content?}
 *                    POST  /api/workspaces/drafts/{draftId}/reject
 *                    POST  /api/workspaces/drafts/{draftId}/regenerate {directive}
 *   • settings     → GET/PATCH /api/workspaces/{id}   (WorkspaceUpdate fields)
 *   • directives   → GET/POST /api/workspaces/{id}/directives
 *                    PATCH /api/directives/{directiveId} {is_active}
 *
 * These paths are already forwarded to v1 by the devnet catch-all proxy
 * (main.py v1_same_origin_proxy; "workspaces" + "directives" are proxied
 * prefixes), so this is a pure frontend surface — no new BFF routes.
 *
 * This module is intentionally DOM-free and side-effect-free: it exports mode
 * metadata, resolvers, and HTML builders. app.ts owns the fetch calls and the
 * (delegated) event wiring, and re-renders by calling these builders again.
 * Keeping it pure is what lets scripts/test-aias-console.mjs assert the
 * behaviour without a browser.
 */

export type WsMode = "ai" | "shadow" | "takeover";

export interface WsModeMeta {
  id: WsMode;
  /** short label shown in the segmented switch (Mark's words: human = takeover) */
  label: string;
  /** one-line explanation, used as the button tooltip and the mode hint */
  blurb: string;
}

/** The three v1 WorkspaceMode values, in the order the switch presents them. */
export const WS_MODES: WsModeMeta[] = [
  { id: "ai", label: "AI", blurb: "The assistant replies to the client automatically." },
  { id: "shadow", label: "Shadow", blurb: "The assistant drafts replies for you to review before they send." },
  { id: "takeover", label: "Human", blurb: "You reply to the client yourself; the assistant stays quiet." },
];

/** Coerce any upstream value to a known mode (defaults to "ai", v1's default). */
export function normalizeMode(m: unknown): WsMode {
  const s = String(m ?? "").toLowerCase();
  return s === "ai" || s === "shadow" || s === "takeover" ? (s as WsMode) : "ai";
}

export function modeMeta(m: unknown): WsModeMeta {
  const id = normalizeMode(m);
  return WS_MODES.find((x) => x.id === id) as WsModeMeta;
}

/** Minimal HTML-attribute/-text escaper (module is self-contained on purpose). */
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

/**
 * The composer always sends a HUMAN (manager) reply via /admin-message — this
 * is exactly what the v1 admin console does regardless of mode. The mode only
 * changes what the workspace does with the *client's* turns (auto-reply /
 * draft / wait for a human), so the placeholder just sets expectations.
 */
export function composerPlaceholder(mode: unknown): string {
  switch (normalizeMode(mode)) {
    case "takeover":
      return "Reply to the client as a human…";
    case "shadow":
      return "Reply as a human — or review the AI draft below…";
    default:
      return "Reply as a human — the assistant is auto-answering this workspace…";
  }
}

/** Header segmented control. Buttons carry data-ws-mode for delegation. */
export function renderModeSwitch(mode: unknown): string {
  const cur = normalizeMode(mode);
  const btns = WS_MODES.map((m) => {
    const on = m.id === cur;
    const cls = on
      ? "bg-emerald-500/20 text-emerald-400"
      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60";
    return `<button type="button" class="aias-mode-btn px-2.5 py-1 text-xs font-semibold transition-colors ${cls}" data-ws-mode="${m.id}" aria-pressed="${on ? "true" : "false"}" title="${esc(m.blurb)}">${esc(m.label)}</button>`;
  }).join("");
  return `<div class="aias-mode-switch inline-flex rounded-lg border border-zinc-700 overflow-hidden" role="group" aria-label="Workspace mode" data-ws-mode-switch="1">${btns}</div>`;
}

/**
 * The operator bar that sits directly above the composer for bridged twins:
 * the mode switch plus a one-line hint for the current mode.
 */
export function renderOperatorBar(mode: unknown): string {
  const meta = modeMeta(mode);
  return `<div class="aias-operator-bar flex items-center gap-3 mb-2 flex-wrap" data-aias-operator="1">
    ${renderModeSwitch(mode)}
    <span class="text-[11px] text-zinc-500 flex-1 min-w-0">${esc(meta.blurb)}</span>
  </div>`;
}

export interface WsDraft {
  id: string;
  content: string;
  user_message?: string;
  created_at?: string;
  regeneration_count?: number;
}

/** Shadow-mode pending drafts, each editable inline before approving. */
export function renderDrafts(drafts: WsDraft[] | null | undefined): string {
  const list = Array.isArray(drafts) ? drafts : [];
  if (list.length === 0) return "";
  const cards = list
    .map(
      (d) => `<div class="aias-draft rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-draft-id="${esc(d.id)}">
      ${d.user_message ? `<p class="text-[11px] text-zinc-500 mb-1 truncate">re: ${esc(d.user_message)}</p>` : ""}
      <textarea class="aias-draft-text w-full bg-zinc-900/60 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-100" rows="3">${esc(d.content)}</textarea>
      <div class="flex items-center gap-2 mt-2">
        <button type="button" class="aias-draft-approve px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30" data-draft-id="${esc(d.id)}">Approve &amp; send</button>
        <button type="button" class="aias-draft-regen px-2.5 py-1 rounded-md bg-zinc-700/50 text-zinc-300 text-xs font-semibold hover:bg-zinc-700" data-draft-id="${esc(d.id)}">Regenerate…</button>
        <button type="button" class="aias-draft-reject px-2.5 py-1 rounded-md text-zinc-500 text-xs font-semibold hover:text-red-400" data-draft-id="${esc(d.id)}">Reject</button>
        ${d.regeneration_count ? `<span class="text-[10px] text-zinc-600 ml-auto">regen ×${esc(d.regeneration_count)}</span>` : ""}
      </div>
    </div>`,
    )
    .join("");
  return `<div class="aias-drafts space-y-2 mb-2" data-aias-drafts="1">
    <p class="text-[10px] font-bold uppercase tracking-wider text-amber-400">Pending AI drafts (${list.length})</p>
    ${cards}
  </div>`;
}

export interface WsConfig {
  mode?: string;
  conversation_memory_enabled?: boolean;
  conversation_buffer_compression_enabled?: boolean;
  conversation_message_limit?: number;
  web_search_enabled?: boolean;
  needs_human_attention?: boolean;
  conversation_memory_scope?: string;
  staff_availability?: string;
  staff_availability_message?: string;
}

export interface WsDirective {
  id: string;
  content: string;
  type?: string;
  is_active?: boolean;
}

/** StaffAvailability enum values (v1 schemas.py). */
export const STAFF_AVAILABILITY = ["online", "away", "offline"] as const;
/** MemoryScope enum values (v1 schemas.py). */
export const MEMORY_SCOPES = ["user", "workspace", "conversation", "lead"] as const;

function toggleRow(field: keyof WsConfig, label: string, on: boolean, blurb: string): string {
  return `<label class="flex items-start justify-between gap-3 py-2 cursor-pointer">
    <span class="min-w-0">
      <span class="block text-sm text-zinc-200">${esc(label)}</span>
      <span class="block text-[11px] text-zinc-500">${esc(blurb)}</span>
    </span>
    <input type="checkbox" class="aias-ws-toggle mt-1 shrink-0" data-ws-field="${esc(field)}" ${on ? "checked" : ""} />
  </label>`;
}

/**
 * Full settings surface for a bridged workspace, rendered inside the community
 * settings modal. Controls carry data-ws-field / data-ws-directive-* so app.ts
 * can PATCH the workspace (or directives) on change. Covers every
 * WorkspaceUpdate field a manager touches, plus directive management.
 */
export function renderWsSettings(ws: WsConfig | null | undefined, directives: WsDirective[] | null | undefined): string {
  const c = ws || {};
  const dirs = Array.isArray(directives) ? directives : [];
  const scope = String(c.conversation_memory_scope || "user").toLowerCase();
  const avail = String(c.staff_availability || "online").toLowerCase();
  const limit = Number.isFinite(c.conversation_message_limit as number)
    ? (c.conversation_message_limit as number)
    : 20;

  const scopeOpts = MEMORY_SCOPES.map(
    (s) => `<option value="${s}" ${s === scope ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`,
  ).join("");
  const availOpts = STAFF_AVAILABILITY.map(
    (s) => `<option value="${s}" ${s === avail ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`,
  ).join("");

  const dirRows =
    dirs.length === 0
      ? `<p class="text-[11px] text-zinc-600 py-1">No directives yet. Add one to steer the assistant.</p>`
      : dirs
          .map(
            (d) => `<div class="aias-directive flex items-start gap-2 py-1.5" data-directive-id="${esc(d.id)}">
        <button type="button" class="aias-dir-toggle mt-0.5 shrink-0 text-xs font-semibold ${d.is_active ? "text-emerald-400" : "text-zinc-600"}" data-directive-id="${esc(d.id)}" data-active="${d.is_active ? "1" : "0"}" title="${d.is_active ? "Active — click to disable" : "Disabled — click to enable"}">${d.is_active ? "●" : "○"}</button>
        <span class="min-w-0 flex-1">
          <span class="block text-sm text-zinc-200 break-words">${esc(d.content)}</span>
          <span class="block text-[10px] uppercase tracking-wider text-zinc-600">${esc(d.type || "guidance")}</span>
        </span>
      </div>`,
          )
          .join("");

  return `<div class="aias-ws-settings space-y-4" data-aias-ws-settings="1">
    <div>
      <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Reply mode</p>
      ${renderModeSwitch(c.mode)}
    </div>

    <div class="border-t border-zinc-800 pt-3">
      <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Assistant</p>
      ${toggleRow("web_search_enabled", "Web search", !!c.web_search_enabled, "Let the assistant search the web while answering.")}
      ${toggleRow("needs_human_attention", "Needs human attention", !!c.needs_human_attention, "Flags this workspace for a human. Turn off once handled.")}
    </div>

    <div class="border-t border-zinc-800 pt-3">
      <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Memory &amp; context</p>
      ${toggleRow("conversation_memory_enabled", "Conversation memory", !!c.conversation_memory_enabled, "Remember facts across turns.")}
      ${toggleRow("conversation_buffer_compression_enabled", "Compress context", !!c.conversation_buffer_compression_enabled, "Summarise older turns to fit more history in context.")}
      <label class="flex items-center justify-between gap-3 py-2">
        <span class="text-sm text-zinc-200">Memory scope</span>
        <select class="aias-ws-select bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-100" data-ws-field="conversation_memory_scope">${scopeOpts}</select>
      </label>
      <label class="flex items-center justify-between gap-3 py-2">
        <span class="text-sm text-zinc-200">Context message limit</span>
        <input type="number" min="1" max="50" value="${esc(limit)}" class="aias-ws-number bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-100 w-20" data-ws-field="conversation_message_limit" />
      </label>
    </div>

    <div class="border-t border-zinc-800 pt-3">
      <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Staff availability</p>
      <label class="flex items-center justify-between gap-3 py-2">
        <span class="text-sm text-zinc-200">Status</span>
        <select class="aias-ws-select bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-100" data-ws-field="staff_availability">${availOpts}</select>
      </label>
      <input type="text" value="${esc(c.staff_availability_message || "")}" placeholder="Away message shown to clients…" class="aias-ws-text w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-100" data-ws-field="staff_availability_message" />
    </div>

    <div class="border-t border-zinc-800 pt-3">
      <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Directives</p>
      <div class="aias-directives-list">${dirRows}</div>
      <form class="aias-directive-add flex items-center gap-2 mt-2" data-aias-directive-add="1">
        <input type="text" name="content" placeholder="Add a directive (e.g. always confirm the client's timezone)…" class="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-100" autocomplete="off" />
        <button type="submit" class="px-2.5 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30">Add</button>
      </form>
    </div>
  </div>`;
}
