// Runs the Playwright regression tests (scripts/*.browser.test.mjs|cjs) one at a time
// against the built site in dist/, served locally. These tests are manual regression
// checks, not part of CI: they need Playwright and a Chromium-family browser.
//   PLAYWRIGHT_MODULE  path to a playwright package (default: resolve "playwright")
//   EDGE_EXECUTABLE    browser executable (default: Microsoft Edge in its standard
//                      Windows location when present, otherwise Playwright's Chromium)
// Usage: npm run build && node scripts/run-browser-tests.mjs [name-filter ...] [--report out.json] [--timeout 300]
//   The site guards (scripts/lib/guard.mjs) also take --pages, --area, --widths, --themes and --owner, passed to them
//   as GUARD_PAGES, GUARD_AREA, GUARD_WIDTHS, GUARD_THEMES and FOLIO_OWNER; other tests ignore them.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { distBuilt, serveDist } from "./lib/static-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args.splice(index, 2)[1] : undefined; };
const reportPath = option("report");
const timeoutSeconds = Number(option("timeout") || 300);
const guardEnv = Object.fromEntries([["pages", "GUARD_PAGES"], ["area", "GUARD_AREA"], ["widths", "GUARD_WIDTHS"], ["themes", "GUARD_THEMES"], ["owner", "FOLIO_OWNER"]]
  .map(([name, variable]) => [variable, option(name)]).filter(([, value]) => value));
const filters = args.filter((arg) => !arg.startsWith("--"));

if (!distBuilt()) {
  console.error("Build the site first (npm run build); the tests run against dist/.");
  process.exit(1);
}

let playwrightModule = process.env.PLAYWRIGHT_MODULE;
if (!playwrightModule) {
  try { playwrightModule = createRequire(path.join(root, "package.json")).resolve("playwright"); }
  catch { console.error("Playwright not found. Install it or set PLAYWRIGHT_MODULE to a playwright package path."); process.exit(1); }
}
const edgeCandidates = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"];
const edgeExecutable = process.env.EDGE_EXECUTABLE || edgeCandidates.find((candidate) => fs.existsSync(candidate)) || "";

// The server takes a free port, so browser runs in several checkouts can overlap (scripts/lib/static-server.mjs).
const server = await serveDist();
const siteUrl = server.url;

const tests = fs.readdirSync(path.join(root, "scripts"))
  .filter((name) => /\.browser\.test\.(mjs|cjs)$/.test(name))
  .filter((name) => !filters.length || filters.some((filter) => name.includes(filter)))
  .sort();

function killTree(child) {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGKILL");
}

function run(name) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join("scripts", name)], {
      cwd: root,
      // Older tests read TEST_BASE_URL instead of SITE_TEST_URL. Protected-archive checks stay optional:
      // they run only when MISSION_TEST_PASSWORD / MISSION_PRIVATE_SOURCE are already set by the owner.
      env: { ...process.env, ...guardEnv, SITE_TEST_URL: siteUrl, TEST_BASE_URL: siteUrl, PLAYWRIGHT_MODULE: playwrightModule, ...(edgeExecutable ? { EDGE_EXECUTABLE: edgeExecutable } : {}) }
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    const timer = setTimeout(() => { output += `\nTimed out after ${timeoutSeconds}s`; killTree(child); }, timeoutSeconds * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ name, passed: code === 0, seconds: Math.round((Date.now() - started) / 1000), output: output.trim().split(/\r?\n/).slice(-12).join("\n") });
    });
  });
}

console.log(`Running ${tests.length} browser tests against ${siteUrl}${edgeExecutable ? " with " + edgeExecutable : ""}`);
const results = [];
for (const name of tests) {
  const result = await run(name);
  results.push(result);
  console.log(`${result.passed ? "PASS" : "FAIL"}  ${name}  (${result.seconds}s)`);
  if (!result.passed) console.log(result.output.split("\n").map((line) => "      " + line).join("\n"));
  if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
}
server.close();
const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed${failed.length ? ": " + failed.map((result) => result.name).join(", ") : ""}`);
process.exitCode = failed.length ? 1 : 0;
