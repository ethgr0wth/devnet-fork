#!/usr/bin/env node
/**
 * Frontend lib tests — run with: node scripts/test-frontend-libs.mjs
 *
 * Bundles the pure lib modules with esbuild and asserts them against the
 * REAL reference behaviors:
 *   - keystoneChat.buildKeystoneChatBody vs QuestsWorkspace's exact send body
 *   - surgicalEdit.parseSurgicalEdits vs the backend grammar
 *     (quests.py _parse_keystone_blocks), including the production failure
 *     shape that leaked raw <<<REPLACE>>> markers into chat prose.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tmp = mkdtempSync(join(tmpdir(), "fe-libs-"));
const bundle = (entry, out) => {
  execSync(
    `npx esbuild ${entry} --bundle --format=cjs --outfile=${join(tmp, out)}`,
    { stdio: "pipe" }
  );
  return join(tmp, out);
};

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
};

// esbuild CJS bundles expose named exports via getters that Node's ESM/CJS
// interop doesn't always lex — unwrap .default when present.
const importCjs = async (path) => {
  const mod = await import(path);
  return mod.default && Object.keys(mod.default).length ? mod.default : mod;
};

// ── keystoneChat ─────────────────────────────────────────────────────────────
const { buildKeystoneChatBody } = await importCjs(
  bundle("src/frontend/v1/lib/keystoneChat.ts", "keystoneChat.cjs")
);

console.log("keystoneChat.buildKeystoneChatBody (QuestsWorkspace matrix):");

test("keystone + read&write → no focus, no read_only, defaults sent", () => {
  const b = buildKeystoneChatBody({ message: "hi", editorMode: "keystone", readOnlyMode: false });
  assert.equal(b.focus_mode, false);
  assert.equal(b.read_only, false);
  assert.equal(b.temperature, 0.7);
  assert.equal(b.max_tokens, 32768);
  assert.equal(b.persona, undefined);
  assert.equal(b.model, undefined);
});

test("keystone + read-only → read_only true", () => {
  const b = buildKeystoneChatBody({ message: "hi", editorMode: "keystone", readOnlyMode: true });
  assert.equal(b.focus_mode, false);
  assert.equal(b.read_only, true);
});

test("focus suppresses read_only even when toggled (QW: readOnly && mode!==focus)", () => {
  const b = buildKeystoneChatBody({ message: "hi", editorMode: "focus", readOnlyMode: true });
  assert.equal(b.focus_mode, true);
  assert.equal(b.read_only, false);
});

test("model 'auto' and '' omitted; real model passed through", () => {
  assert.equal(buildKeystoneChatBody({ message: "m", editorMode: "keystone", readOnlyMode: false, model: "auto" }).model, undefined);
  assert.equal(buildKeystoneChatBody({ message: "m", editorMode: "keystone", readOnlyMode: false, model: "" }).model, undefined);
  assert.equal(buildKeystoneChatBody({ message: "m", editorMode: "keystone", readOnlyMode: false, model: "claude-sonnet-5" }).model, "claude-sonnet-5");
});

test("settings overrides + empty persona omitted, non-empty sent", () => {
  const b = buildKeystoneChatBody({
    message: "m", editorMode: "keystone", readOnlyMode: false,
    settings: { temperature: 0.2, maxTokens: 4096, persona: "terse reviewer" },
  });
  assert.equal(b.temperature, 0.2);
  assert.equal(b.max_tokens, 4096);
  assert.equal(b.persona, "terse reviewer");
});

test("JSON body matches QuestsWorkspace field set exactly", () => {
  const b = buildKeystoneChatBody({ message: "m", editorMode: "keystone", readOnlyMode: false });
  assert.deepEqual(
    Object.keys(b).sort(),
    ["focus_mode", "max_tokens", "message", "model", "persona", "read_only", "temperature"].sort()
  );
});

// ── surgicalEdit ─────────────────────────────────────────────────────────────
const { parseSurgicalEdits, stripPartialSentinels } = await importCjs(
  bundle("src/frontend/v1/lib/surgicalEdit.ts", "surgicalEdit.cjs")
);

console.log("surgicalEdit.parseSurgicalEdits (backend grammar):");

const PROD_FAILURE = [
  "Found it — two duplicated pairs. Fixing all of it:",
  "<<<EDIT README.md>>>",
  "<<<REPLACE lines 5-6>>>",
  "> © Interchained LLC × Claude Sonnet 5 — MIT License",
  "<<<END>>>",
  "<<<REPLACE lines 100-100>>>",
  "<<<END>>>",
  "<<<REPLACE lines 121-121>>>",
  "© Interchained LLC × Claude Sonnet 5 — MIT License",
  "<<<END>>>",
  "<<<END>>>",
  "",
  "Changes made: collapsed 5-6, removed 100, fixed 121.",
].join("\n");

test("production failure shape: 3 ops parsed, zero raw markers in prose", () => {
  const r = parseSurgicalEdits(PROD_FAILURE);
  assert.equal(r.edits.length, 3);
  assert.deepEqual(
    r.edits.map((e) => [e.startLine, e.endLine]),
    [[5, 6], [100, 100], [121, 121]]
  );
  assert.ok(!r.explanation.includes("<<<"));
  assert.ok(r.explanation.includes("Changes made"));
});

test("mid-stream cut inside op 3 → partial flagged, no raw markers", () => {
  const cut = PROD_FAILURE.split("\n").slice(0, 9).join("\n");
  const r = parseSurgicalEdits(cut);
  assert.equal(r.edits.length, 3);
  assert.equal(r.edits[2].partial, true);
  assert.ok(!r.explanation.includes("<<<"));
});

test("stream frontier: EDIT just opened → inProgressFile", () => {
  const r = parseSurgicalEdits("Working.\n<<<EDIT README.md>>>");
  assert.equal(r.inProgressFile, "README.md");
  assert.equal(r.edits.length, 0);
  assert.ok(!r.explanation.includes("<<<"));
});

test("FILE block + single-END EDIT + trailing prose", () => {
  const r = parseSurgicalEdits(
    "<<<FILE new.md>>>\nhello\n<<<END>>>\n<<<EDIT a.ts>>>\n<<<REPLACE lines 2-2>>>\nx\n<<<END>>>\nprose after"
  );
  assert.deepEqual(r.edits.map((e) => e.type), ["full_replace", "replace"]);
  assert.equal(r.explanation, "prose after");
});

test("INSERT and DELETE ops parse; stripPartialSentinels drops residue", () => {
  const r = parseSurgicalEdits(
    "<<<EDIT a.py>>>\n<<<INSERT after line 3>>>\nnew line\n<<<END>>>\n<<<DELETE lines 8-9>>>\n<<<END>>>\n"
  );
  assert.deepEqual(r.edits.map((e) => e.type), ["insert", "delete"]);
  assert.equal(r.edits[0].startLine, 4);
  assert.equal(stripPartialSentinels("keep\n<<<EDIT half"), "keep");
});

rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? "\nFAILED" : `\nAll ${passed} tests passed.`);
