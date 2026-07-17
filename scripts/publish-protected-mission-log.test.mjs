import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const publisher = path.join(scriptsDir, "publish-protected-mission-log.mjs");
const passphrase = "test-passphrase-at-least-16";

const validEntry = (overrides = {}) => ({
  id: "log-001",
  number: 1,
  isoDate: "2026-07-17",
  label: "Test entry",
  bodyHtml: "<p>Test body</p>",
  ...overrides
});

const runPublisher = (entries, output) => {
  const source = path.join(path.dirname(output), "mission-log.private.json");
  fs.writeFileSync(source, JSON.stringify(entries));
  return spawnSync(process.execPath, [publisher], {
    encoding: "utf8",
    env: {
      ...process.env,
      MISSION_LOG_PASSPHRASE: passphrase,
      MISSION_LOG_SOURCE: source,
      MISSION_LOG_OUTPUT: output
    }
  });
};

const withTempOutput = (callback) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mission-log-publisher-"));
  try {
    callback(path.join(directory, "mission-log.enc.json"));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

for (const [name, entry, error] of [
  ["non-object entries", [], /entry must be a plain object/],
  ["empty IDs", validEntry({ id: " " }), /id must be a non-empty string/],
  ["invalid numbers", validEntry({ number: 0 }), /number must be a positive finite number/],
  [
    "missing dates",
    validEntry({ isoDate: " ", date: "" }),
    /either isoDate or date must be a non-empty string/
  ],
  ["empty labels", validEntry({ label: " " }), /label must be a non-empty string/],
  ["empty bodies", validEntry({ bodyHtml: " " }), /bodyHtml must be a non-empty string/]
]) {
  test(`rejects ${name} before writing output`, () => {
    withTempOutput((output) => {
      const result = runPublisher([entry], output);

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, error);
      assert.equal(fs.existsSync(output), false);
    });
  });
}

test("rejects duplicate IDs before writing output", () => {
  withTempOutput((output) => {
    const result = runPublisher([validEntry(), validEntry({ number: 2 })], output);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /id must be unique/);
    assert.equal(fs.existsSync(output), false);
  });
});

test("publishes complete payload atomically to an overridden output", () => {
  withTempOutput((output) => {
    fs.writeFileSync(output, "previous-content");
    const result = runPublisher([validEntry()], output);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(output, "utf8"))).sort(), [
      "cipher",
      "ciphertext",
      "iterations",
      "iv",
      "kdf",
      "salt",
      "version"
    ]);
    assert.equal(
      fs.readdirSync(path.dirname(output)).some((name) => name.includes("mission-log.enc.json.") && name.endsWith(".tmp")),
      false
    );
  });
});
