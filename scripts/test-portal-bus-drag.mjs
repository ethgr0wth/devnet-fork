#!/usr/bin/env node
/** node scripts/test-portal-bus-drag.mjs */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tmp = mkdtempSync(join(tmpdir(), "portal-bd-"));
const load = (entry, out) => {
  execSync(`npx esbuild ${entry} --bundle --format=cjs --outfile=${join(tmp, out)}`, { stdio: "pipe" });
  return import(join(tmp, out)).then((m) => (m.default && Object.keys(m.default).length ? m.default : m));
};
let passed = 0;
// await each test so async bodies don't interleave on the shared singleton
const test = async (n, f) => { try { await f(); passed++; console.log(`  ✓ ${n}`); } catch (e) { console.error(`  ✗ ${n}\n    ${e.message}`); process.exitCode = 1; } };

// ── portalBus ────────────────────────────────────────────────────────────────
const bus = await load("src/frontend/aios/portalBus.ts", "bus.cjs");
console.log("portalBus:");

await test("no target initially; bar not mounted", () => {
  bus.__resetPortalBus();
  assert.equal(bus.getPortalTarget(), null);
  assert.equal(bus.isPortalBarMounted(), false);
});

await test("register routes text to the app's submit closure", async () => {
  bus.__resetPortalBus();
  let got = null;
  const off = bus.registerPortalTarget({ appId: "keystone", label: "KeyStone", submit: (t) => { got = t; } });
  const tgt = bus.getPortalTarget();
  assert.equal(tgt.appId, "keystone");
  await tgt.submit("run the tests");
  assert.equal(got, "run the tests");
  off();
  assert.equal(bus.getPortalTarget(), null);
});

await test("subscribers fire on register/unregister and bar mount", () => {
  bus.__resetPortalBus();
  let n = 0;
  const unsub = bus.subscribePortalBus(() => { n++; });
  const off = bus.registerPortalTarget({ appId: "images", label: "Images", submit: () => {} });
  bus.setPortalBarMounted(true);
  off();
  assert.equal(n, 3);
  assert.equal(bus.isPortalBarMounted(), true);
  bus.setPortalBarMounted(true); // idempotent — no extra notify
  assert.equal(n, 3);
  unsub();
});

await test("latest registration wins; unregistering a stale target is a no-op", () => {
  bus.__resetPortalBus();
  const offA = bus.registerPortalTarget({ appId: "a", label: "A", submit: () => {} });
  bus.registerPortalTarget({ appId: "b", label: "B", submit: () => {} });
  assert.equal(bus.getPortalTarget().appId, "b");
  offA(); // A already superseded — must NOT clear B
  assert.equal(bus.getPortalTarget().appId, "b");
});

// ── portal-drag ──────────────────────────────────────────────────────────────
const drag = await load("src/frontend/aios/portal-drag.ts", "drag.cjs");
console.log("portal-drag.clampPosition:");
const bar = { width: 860, height: 120 };
const vp = { width: 1440, height: 900 };

await test("in-bounds position is preserved", () => {
  assert.deepEqual(drag.clampPosition({ x: 300, y: 200 }, bar, vp), { x: 300, y: 200 });
});
await test("off the right/bottom edge clamps to the margin-bounded max", () => {
  assert.deepEqual(drag.clampPosition({ x: 5000, y: 5000 }, bar, vp), { x: 1440 - 860 - 8, y: 900 - 120 - 8 });
});
await test("negative desired clamps to the top-left margin", () => {
  assert.deepEqual(drag.clampPosition({ x: -100, y: -50 }, bar, vp), { x: 8, y: 8 });
});
await test("bar larger than viewport pins to top-left margin (no negative max)", () => {
  assert.deepEqual(drag.clampPosition({ x: 200, y: 200 }, { width: 2000, height: 1200 }, vp), { x: 8, y: 8 });
});

rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? "\nFAILED" : `\nAll ${passed} tests passed.`);
