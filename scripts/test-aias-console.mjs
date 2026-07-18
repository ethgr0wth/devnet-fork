/**
 * Unit tests for src/frontend/aiasConsole.ts (bridged-workspace operator
 * console builders). The module is pure/DOM-free, so we esbuild it to ESM and
 * assert on the emitted HTML + resolvers — no browser needed.
 *
 * Run:
 *   node_modules/.bin/esbuild src/frontend/aiasConsole.ts --format=esm \
 *     --outfile=/tmp/aiasConsole.test.mjs --log-level=error
 *   node scripts/test-aias-console.mjs
 */
const mod = await import("file:///tmp/aiasConsole.test.mjs");
const {
  WS_MODES, normalizeMode, modeMeta, esc, composerPlaceholder,
  renderModeSwitch, renderOperatorBar, renderDrafts, renderWsSettings,
  STAFF_AVAILABILITY, MEMORY_SCOPES,
} = mod;

let passed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { console.log(`  FAIL ${name}`); process.exit(1); }
}
const count = (s, re) => (s.match(re) || []).length;

// ── modes ────────────────────────────────────────────────────────────────
check("WS_MODES is [ai, shadow, takeover] in order",
  WS_MODES.map((m) => m.id).join(",") === "ai,shadow,takeover");
check("takeover is labelled Human (Mark's word for it)",
  modeMeta("takeover").label === "Human");
check("ai / shadow keep their labels",
  modeMeta("ai").label === "AI" && modeMeta("shadow").label === "Shadow");

check("normalizeMode passes known modes", normalizeMode("shadow") === "shadow");
check("normalizeMode is case-insensitive", normalizeMode("TAKEOVER") === "takeover");
check("normalizeMode defaults unknown/empty to ai",
  normalizeMode("") === "ai" && normalizeMode(undefined) === "ai" && normalizeMode("bogus") === "ai");

// ── composer placeholder ───────────────────────────────────────────────────
check("placeholder differs per mode",
  new Set(["ai", "shadow", "takeover"].map(composerPlaceholder)).size === 3);
check("takeover placeholder mentions replying as a human",
  /human/i.test(composerPlaceholder("takeover")));

// ── mode switch ────────────────────────────────────────────────────────────
const sw = renderModeSwitch("shadow");
check("mode switch renders all three buttons",
  count(sw, /data-ws-mode="/g) === 3
  && sw.includes('data-ws-mode="ai"')
  && sw.includes('data-ws-mode="shadow"')
  && sw.includes('data-ws-mode="takeover"'));
check("exactly one button is pressed", count(sw, /aria-pressed="true"/g) === 1);
check("the pressed button is the current mode",
  /data-ws-mode="shadow"[^>]*aria-pressed="true"/.test(sw));

const bar = renderOperatorBar("ai");
check("operator bar embeds the switch + a hint",
  bar.includes("aias-mode-switch") && bar.includes(modeMeta("ai").blurb));

// ── drafts (shadow) ─────────────────────────────────────────────────────────
check("no drafts → empty string (no panel)", renderDrafts([]) === "" && renderDrafts(null) === "");
const drafts = renderDrafts([
  { id: "d1", content: "Hello there", user_message: "hi", regeneration_count: 2 },
  { id: "d2", content: "Second" },
]);
check("renders one card per draft", count(drafts, /class="aias-draft /g) === 2);
check("each draft has approve / regenerate / reject actions",
  drafts.includes("aias-draft-approve") && drafts.includes("aias-draft-regen") && drafts.includes("aias-draft-reject"));
check("draft carries its id for delegation", drafts.includes('data-draft-id="d1"') && drafts.includes('data-draft-id="d2"'));
check("draft content sits in an editable textarea",
  /<textarea[^>]*class="aias-draft-text[^"]*"[^>]*>Hello there<\/textarea>/.test(drafts));
check("regeneration count surfaced when present", drafts.includes("regen ×2"));
check("draft panel header counts pending drafts", drafts.includes("Pending AI drafts (2)"));

// XSS: draft content must be escaped, never live markup
const evil = renderDrafts([{ id: "x", content: "<script>alert(1)</script>" }]);
check("draft content is escaped (no raw <script>)",
  !evil.includes("<script>") && evil.includes("&lt;script&gt;"));

// ── settings surface (every WorkspaceUpdate field a manager touches) ─────────
const ws = renderWsSettings(
  {
    mode: "takeover",
    web_search_enabled: true,
    needs_human_attention: false,
    conversation_memory_enabled: true,
    conversation_buffer_compression_enabled: false,
    conversation_memory_scope: "workspace",
    conversation_message_limit: 35,
    staff_availability: "away",
    staff_availability_message: "Back at 2pm",
  },
  [
    { id: "g1", content: "Confirm the client timezone", type: "guidance", is_active: true },
    { id: "g2", content: "Never quote a price", type: "constraint", is_active: false },
  ],
);
for (const field of [
  "web_search_enabled", "needs_human_attention", "conversation_memory_enabled",
  "conversation_buffer_compression_enabled", "conversation_memory_scope",
  "conversation_message_limit", "staff_availability", "staff_availability_message",
]) {
  check(`settings expose ${field}`, ws.includes(`data-ws-field="${field}"`));
}
check("settings embed the mode switch too", ws.includes("aias-mode-switch"));
check("checked toggle reflects state (web_search on)",
  /data-ws-field="web_search_enabled"[^>]*checked/.test(ws));
check("unchecked toggle reflects state (attention off)",
  !/data-ws-field="needs_human_attention"[^>]*checked/.test(ws));
check("memory scope preselects current value",
  /<option value="workspace" selected>/.test(ws));
check("staff availability preselects current value",
  /<option value="away" selected>/.test(ws));
check("message limit carries current value", ws.includes('value="35"'));
check("staff message carries current value", ws.includes('value="Back at 2pm"'));
check("all staff-availability options present",
  STAFF_AVAILABILITY.every((s) => ws.includes(`value="${s}"`)));
check("all memory scopes present",
  MEMORY_SCOPES.every((s) => ws.includes(`value="${s}"`)));

// directives
check("directive rows render with id + toggle", count(ws, /class="aias-directive /g) === 2
  && ws.includes('data-directive-id="g1"') && ws.includes('data-directive-id="g2"'));
check("active/inactive directive state encoded",
  ws.includes('data-active="1"') && ws.includes('data-active="0"'));
check("directive add form present", ws.includes("aias-directive-add"));
check("empty directives → prompt to add", renderWsSettings({}, []).includes("No directives yet"));

// XSS in a directive
const evilDir = renderWsSettings({}, [{ id: "z", content: "<img src=x onerror=alert(1)>", is_active: true }]);
check("directive content escaped",
  !evilDir.includes("<img src=x") && evilDir.includes("&lt;img src=x"));

// ── esc ──────────────────────────────────────────────────────────────────
check("esc handles all five entities",
  esc(`<>&"'`) === "&lt;&gt;&amp;&quot;&#39;");

console.log(`\nAll ${passed} tests passed.`);
