// Runs every Node unit test: scripts/*.test.mjs and src/**/*.test.mjs, excluding the
// Playwright browser tests (scripts/*.browser.test.*, run with run-browser-tests.mjs).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const tests = [...walk(path.join(root, "scripts")), ...walk(path.join(root, "src"))]
  .filter((file) => file.endsWith(".test.mjs") && !file.endsWith(".browser.test.mjs"))
  .map((file) => path.relative(root, file))
  .sort();
console.log(`Running ${tests.length} unit test files`);
const result = spawnSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
process.exitCode = result.status ?? 1;
