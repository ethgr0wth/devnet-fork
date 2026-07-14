#!/usr/bin/env node
/**
 * Shell wrapper tests — run with: node scripts/test-shell-wrapper.mjs
 *
 * Asserts the pure halves of the remote shell (lib/runtimeSession):
 * buildShellRunCode (the python wrapper QuestsWorkspace's dock and
 * RuntimeSession.runShell both ride) and parseShellRunResult (marker
 * strip, cwd persistence, host-path scrubbing).
 */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tmp = mkdtempSync(join(tmpdir(), "shell-wrap-"));
execSync(
  `npx esbuild src/frontend/v1/lib/runtimeSession.ts --bundle --format=cjs --outfile=${join(tmp, "rs.cjs")}`,
  { stdio: "pipe" }
);
const mod = await import(join(tmp, "rs.cjs"));
const { buildShellRunCode, parseShellRunResult, RuntimeSession } =
  mod.default && Object.keys(mod.default).length ? mod.default : mod;

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

console.log("buildShellRunCode:");

test("marker format + 65s cap + timeout/kill wrapper present", () => {
  const { code, marker, timeoutSeconds } = buildShellRunCode("ls -la", ".");
  assert.match(marker, /^__KEYSTONE_CWD_[0-9a-f]{32}__$/);
  assert.equal(timeoutSeconds, 65);
  assert.ok(code.includes("timeout=55"));
  assert.ok(code.includes("sys.exit(124)"));
  assert.ok(code.includes("os.killpg"));
  assert.ok(code.includes("start_new_session=True"));
  assert.ok(code.includes(marker));
});

test("command embeds JSON-escaped (quotes/newlines cannot break the wrapper)", () => {
  const nasty = 'echo "hi $USER"\ncd src && printf \'%s\' done';
  const { code } = buildShellRunCode(nasty, ".");
  // The shell command rides inside a JSON string literal in the python code
  assert.ok(code.includes(JSON.stringify(nasty).slice(1, 20)));
  assert.ok(code.includes('\\"hi $USER\\"'));
});

test("cwd containment: requested dir embedded + realpath guard", () => {
  const { code } = buildShellRunCode("pwd", "src/app");
  assert.ok(code.includes('requested = "src/app"'));
  assert.ok(code.includes("os.path.commonpath([root, workdir]) != root"));
});

console.log("parseShellRunResult:");

const SID = "sessABC";
const ROOT = `/srv/rt/workspaces/${SID}`;

test("marker stripped, cwd extracted relative, host paths scrubbed (stdout+stderr)", () => {
  const marker = "__KEYSTONE_CWD_deadbeef__";
  const r = parseShellRunResult(
    {
      exit_code: 0,
      stdout: `listing ${ROOT}/src/main.ts\n\n${marker}${ROOT}/src\n`,
      stderr: `warn at ${ROOT}/src/x`,
    },
    marker,
    SID,
    "."
  );
  assert.equal(r.cwd, "src");
  assert.ok(!r.stdout.includes(marker));
  assert.ok(!r.stdout.includes(ROOT));
  assert.ok(r.stdout.includes("/workspace/src/main.ts"));
  assert.ok(r.stderr.includes("/workspace/src/x"));
  assert.equal(r.exit_code, 0);
});

test("workspace root cwd → '.'", () => {
  const marker = "__KEYSTONE_CWD_cafe__";
  const r = parseShellRunResult(
    { exit_code: 0, stdout: `ok\n\n${marker}${ROOT}\n`, stderr: "" },
    marker,
    SID,
    "src"
  );
  assert.equal(r.cwd, ".");
});

test("no marker (e.g. hard kill) → passthrough with requested cwd", () => {
  const r = parseShellRunResult(
    { exit_code: 137, stdout: "partial", stderr: "killed" },
    "__KEYSTONE_CWD_x__",
    SID,
    "src"
  );
  assert.equal(r.cwd, "src");
  assert.equal(r.stdout, "partial");
});

test("RuntimeSession class still exports (KLW stays compiling off-route)", () => {
  assert.equal(typeof RuntimeSession, "function");
});

rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? "\nFAILED" : `\nAll ${passed} tests passed.`);
