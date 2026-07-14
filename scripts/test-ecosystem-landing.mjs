#!/usr/bin/env node
/**
 * ecosystem-landing tests — run with: node scripts/test-ecosystem-landing.mjs
 *
 * Asserts the deterministic landing pick that replaces the old
 * `userEcosystems[0]` over an unordered SMEMBERS payload (the DevOne bug).
 */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tmp = mkdtempSync(join(tmpdir(), "eco-landing-"));
execSync(
  `npx esbuild src/frontend/ecosystem-landing.ts --bundle --format=cjs --outfile=${join(tmp, "el.cjs")}`,
  { stdio: "pipe" }
);
const mod = await import(join(tmp, "el.cjs"));
const { pickLandingEcosystem } = mod.default && Object.keys(mod.default).length ? mod.default : mod;

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

const DEVONE = { id: "devone", name: "DevOne" };
const TWIN_OLD = { id: "env-a", name: "Old Env", origin: "aias_v1", origin_synced_at: "2026-07-10T00:00:00" };
const TWIN_NEW = { id: "env-b", name: "SuperAdmin's Workspace", origin: "aias_v1", origin_synced_at: "2026-07-14T12:00:00" };

console.log("pickLandingEcosystem:");

test("DevOne first in list, twin present → twin wins (the reported bug)", () => {
  assert.equal(pickLandingEcosystem([DEVONE, TWIN_NEW], null).id, "env-b");
});

test("multiple twins → freshest origin_synced_at wins", () => {
  assert.equal(pickLandingEcosystem([DEVONE, TWIN_OLD, TWIN_NEW], null).id, "env-b");
  assert.equal(pickLandingEcosystem([TWIN_NEW, TWIN_OLD], null).id, "env-b");
});

test("persisted explicit choice beats the twin preference", () => {
  assert.equal(pickLandingEcosystem([DEVONE, TWIN_NEW], "devone").id, "devone");
});

test("persisted id no longer in the list → falls through to twin", () => {
  assert.equal(pickLandingEcosystem([DEVONE, TWIN_NEW], "gone").id, "env-b");
});

test("no twins → first entry (fallback preserved)", () => {
  assert.equal(pickLandingEcosystem([DEVONE, { id: "x" }], null).id, "devone");
});

test("empty / non-array → null", () => {
  assert.equal(pickLandingEcosystem([], null), null);
  assert.equal(pickLandingEcosystem(undefined, null), null);
});

rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? "\nFAILED" : `\nAll ${passed} tests passed.`);
