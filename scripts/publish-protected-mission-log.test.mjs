import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const decryptEntries = (output) => {
  const payload = JSON.parse(fs.readFileSync(output, "utf8"));
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const encrypted = Buffer.from(payload.ciphertext, "base64");
  const key = pbkdf2Sync(passphrase, salt, payload.iterations, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(encrypted.subarray(-16));
  return JSON.parse(Buffer.concat([
    decipher.update(encrypted.subarray(0, -16)),
    decipher.final()
  ]).toString("utf8"));
};

const hasSiblingTempFile = (output) =>
  fs.readdirSync(path.dirname(output)).some((name) =>
    name.includes("mission-log.enc.json.") && name.endsWith(".tmp")
  );

const withTempOutput = (callback) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mission-log-publisher-"));
  try {
    const result = callback(path.join(directory, "mission-log.enc.json"));
    if (result?.then) {
      return result.finally(() => {
        fs.rmSync(directory, { recursive: true, force: true });
      });
    }
    fs.rmSync(directory, { recursive: true, force: true });
    return result;
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
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
    const entries = [validEntry()];
    fs.writeFileSync(output, "previous-content");
    const result = runPublisher(entries, output);

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
    assert.deepEqual(decryptEntries(output), entries);
    assert.equal(hasSiblingTempFile(output), false);
  });
});

test("publishes thumbnail sources while preserving full-size Mission Log images", () => {
  withTempOutput((output) => {
    const original = "assets/img/mission-log/grad-log-20260701-09.jpg";
    const thumb = "assets/img/thumbs/mission-log/grad-log-20260701-09.webp";
    const image = `<img class="mission-thumb-img" src="${original}" data-full-src="${original}" alt="Test">`;
    const result = runPublisher([
      validEntry({ bodyHtml: `<figure>${image}</figure>`, bodyHtmlJa: `<figure>${image}</figure>` })
    ], output);

    assert.equal(result.status, 0, result.stderr);
    const [entry] = decryptEntries(output);
    for (const html of [entry.bodyHtml, entry.bodyHtmlJa]) {
      assert.match(html, new RegExp(`src="${thumb}"`));
      assert.match(html, new RegExp(`data-full-src="${original}"`));
      assert.doesNotMatch(html, new RegExp(`(?:^|\\s)src="${original}"`));
    }
  });
});

test("keeps the previous output when atomic replacement fails", async () => {
  const originalRename = fs.renameSync;
  const originalEnv = {
    MISSION_LOG_PASSPHRASE: process.env.MISSION_LOG_PASSPHRASE,
    MISSION_LOG_SOURCE: process.env.MISSION_LOG_SOURCE,
    MISSION_LOG_OUTPUT: process.env.MISSION_LOG_OUTPUT
  };

  await withTempOutput(async (output) => {
    const source = path.join(path.dirname(output), "mission-log.private.json");
    const previous = Buffer.from("previous-content");
    fs.writeFileSync(source, JSON.stringify([validEntry()]));
    fs.writeFileSync(output, previous);
    process.env.MISSION_LOG_PASSPHRASE = passphrase;
    process.env.MISSION_LOG_SOURCE = source;
    process.env.MISSION_LOG_OUTPUT = output;
    fs.renameSync = () => {
      throw new Error("forced rename failure");
    };

    try {
      await assert.rejects(
        import(`${pathToFileURL(publisher).href}?rename-failure=${Date.now()}`),
        /forced rename failure/
      );
      assert.deepEqual(fs.readFileSync(output), previous);
      assert.equal(hasSiblingTempFile(output), false);
    } finally {
      fs.renameSync = originalRename;
      for (const [name, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});
