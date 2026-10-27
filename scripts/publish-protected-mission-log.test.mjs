import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// Synthetic fixtures only: no real archive, passphrase or entry text is used here.
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const publisher = path.join(scriptsDir, "publish-protected-mission-log.mjs");
const passphrase = "test-passphrase-at-least-16";
const otherPassphrase = "synthetic-other-passphrase-42";
const syntheticLabel = "Synthetic log 001 - zircon fixture calibration";
const syntheticSentence = "I mounted the synthetic olivine fixture on carbon tape and recorded twelve calibration frames.";

const validEntry = (overrides = {}) => ({
  id: "log-001",
  number: 1,
  isoDate: "2026-07-17",
  label: syntheticLabel,
  bodyHtml: `<p>${syntheticSentence.replace("olivine", "<em>olivine</em>")} Short note.</p>`,
  ...overrides
});

const runPublisher = (entries, output, { args = [], pass = passphrase } = {}) => {
  const source = path.join(path.dirname(output), "mission-log.private.json");
  fs.writeFileSync(source, typeof entries === "string" ? entries : JSON.stringify(entries));
  return spawnSync(process.execPath, [publisher, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      MISSION_LOG_PASSPHRASE: pass,
      MISSION_LOG_SOURCE: source,
      MISSION_LOG_OUTPUT: output,
      MISSION_LOG_LEAK_ROOT: path.join(path.dirname(output), "site")
    }
  });
};

const decryptEntries = (output, pass = passphrase) => {
  const payload = JSON.parse(fs.readFileSync(output, "utf8"));
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const encrypted = Buffer.from(payload.ciphertext, "base64");
  const key = pbkdf2Sync(pass, salt, payload.iterations, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(encrypted.subarray(-16));
  return JSON.parse(Buffer.concat([
    decipher.update(encrypted.subarray(0, -16)),
    decipher.final()
  ]).toString("utf8"));
};

// Console output may name paths, counts and entry ids, never a passphrase or entry text.
const assertQuiet = (result, entries = [validEntry()]) => {
  const printed = `${result.stdout}\n${result.stderr}`;
  for (const secret of [passphrase, otherPassphrase]) assert.equal(printed.includes(secret), false, "passphrase printed");
  for (const entry of entries) {
    for (const text of [entry.label, String(entry.bodyHtml).replace(/<[^>]*>/g, ""), syntheticSentence]) {
      if (typeof text === "string" && text.trim().length >= 8) assert.equal(printed.includes(text.trim()), false, "entry text printed");
    }
  }
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

// Runs the publisher in this process so fs can be patched; restores fs, env and argv afterwards.
const importPublisher = async (output, patches, tag) => {
  const saved = Object.fromEntries(Object.keys(patches).map((name) => [name, fs[name]]));
  const names = ["MISSION_LOG_PASSPHRASE", "MISSION_LOG_SOURCE", "MISSION_LOG_OUTPUT", "MISSION_LOG_LEAK_ROOT"];
  const originalEnv = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalArgv = process.argv;
  const source = path.join(path.dirname(output), "mission-log.private.json");
  fs.writeFileSync(source, JSON.stringify([validEntry()]));
  Object.assign(process.env, {
    MISSION_LOG_PASSPHRASE: passphrase,
    MISSION_LOG_SOURCE: source,
    MISSION_LOG_OUTPUT: output,
    MISSION_LOG_LEAK_ROOT: path.join(path.dirname(output), "site")
  });
  process.argv = [process.execPath, publisher];
  Object.assign(fs, patches);
  try {
    return await import(`${pathToFileURL(publisher).href}?${tag}=${Date.now()}`);
  } finally {
    Object.assign(fs, saved);
    process.argv = originalArgv;
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
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
      assertQuiet(result);
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

test("rejects malformed source JSON without quoting the private source", () => {
  withTempOutput((output) => {
    const result = runPublisher(`[{"id":"log-001","label":"${syntheticLabel}","bodyHtml":"<p>${syntheticSentence}</p>",`, output);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Private Mission Log source is not valid JSON/);
    assert.equal(fs.existsSync(output), false);
    assertQuiet(result);
  });
});

test("rejects unexpected arguments without echoing them", () => {
  withTempOutput((output) => {
    const result = runPublisher([validEntry()], output, { args: [otherPassphrase] });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported arguments/);
    assert.equal(fs.existsSync(output), false);
    assertQuiet(result);
  });
});

test("first publish writes a complete payload atomically when no archive exists", () => {
  withTempOutput((output) => {
    const entries = [validEntry()];
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
    assert.match(result.stdout, /Published 1 Mission Log entry .*\(first publish; round-trip decrypt verified\)/);
    assert.equal(hasSiblingTempFile(output), false);
    assertQuiet(result, entries);
  });
});

test("republishing with the current passphrase confirms the archive before replacing it", () => {
  withTempOutput((output) => {
    assert.equal(runPublisher([validEntry()], output).status, 0);
    const firstSalt = JSON.parse(fs.readFileSync(output, "utf8")).salt;
    const entries = [validEntry(), validEntry({ id: "log-002", number: 2 })];
    const result = runPublisher(entries, output);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Published 2 Mission Log entries .*passphrase confirmed against the existing archive/);
    assert.deepEqual(decryptEntries(output), entries);
    assert.notEqual(JSON.parse(fs.readFileSync(output, "utf8")).salt, firstSalt);
    assertQuiet(result, entries);
  });
});

test("a wrong passphrase aborts without changing the archive", () => {
  withTempOutput((output) => {
    assert.equal(runPublisher([validEntry()], output).status, 0);
    const previous = fs.readFileSync(output);
    const result = runPublisher([validEntry({ label: "Synthetic log 001 - replacement label" })], output, { pass: otherPassphrase });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /This passphrase does not decrypt the existing Mission Log payload/);
    assert.match(result.stderr, /Nothing was written/);
    assert.deepEqual(fs.readFileSync(output), previous);
    assert.deepEqual(decryptEntries(output), [validEntry()]);
    assert.equal(hasSiblingTempFile(output), false);
    assertQuiet(result);
  });
});

test("--rotate-passphrase deliberately replaces the archive passphrase", () => {
  withTempOutput((output) => {
    assert.equal(runPublisher([validEntry()], output).status, 0);
    const result = runPublisher([validEntry()], output, { pass: otherPassphrase, args: ["--rotate-passphrase"] });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /passphrase rotated; round-trip decrypt verified/);
    assert.deepEqual(decryptEntries(output, otherPassphrase), [validEntry()]);
    assert.throws(() => decryptEntries(output, passphrase));
    assertQuiet(result);
  });
});

test("a file that is not a payload is replaced only with --rotate-passphrase", () => {
  withTempOutput((output) => {
    fs.writeFileSync(output, "previous-content");
    const refused = runPublisher([validEntry()], output);

    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /is not a valid Mission Log payload\. Nothing was written/);
    assert.equal(fs.readFileSync(output, "utf8"), "previous-content");
    assertQuiet(refused);

    const replaced = runPublisher([validEntry()], output, { args: ["--rotate-passphrase"] });
    assert.equal(replaced.status, 0, replaced.stderr);
    assert.match(replaced.stdout, /replaced a file that was not a valid payload/);
    assert.deepEqual(decryptEntries(output), [validEntry()]);
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
  await withTempOutput(async (output) => {
    assert.equal(runPublisher([validEntry()], output).status, 0);
    const previous = fs.readFileSync(output);

    await assert.rejects(
      importPublisher(output, { renameSync: () => { throw new Error("forced rename failure"); } }, "rename-failure"),
      /forced rename failure/
    );
    assert.deepEqual(fs.readFileSync(output), previous);
    assert.equal(hasSiblingTempFile(output), false);
  });
});

test("round-trip check refuses a written payload that does not decrypt to the entries", async () => {
  await withTempOutput(async (output) => {
    assert.equal(runPublisher([validEntry()], output).status, 0);
    const previous = fs.readFileSync(output);
    const writeFileSync = fs.writeFileSync;
    // Simulates a corrupted write: flip one ciphertext character in the temporary file only.
    const corrupt = (file, data, ...rest) => {
      if (!String(file).endsWith(".tmp")) return writeFileSync(file, data, ...rest);
      const payload = JSON.parse(data);
      payload.ciphertext = (payload.ciphertext[0] === "A" ? "B" : "A") + payload.ciphertext.slice(1);
      return writeFileSync(file, JSON.stringify(payload), ...rest);
    };

    await assert.rejects(importPublisher(output, { writeFileSync: corrupt }, "round-trip"), /Round-trip check failed/);
    assert.deepEqual(fs.readFileSync(output), previous);
    assert.equal(hasSiblingTempFile(output), false);
  });
});

test("--check-leaks reports planted entry text by path and entry id only", () => {
  withTempOutput((output) => {
    const site = path.join(path.dirname(output), "site");
    const plant = (relative, text) => {
      fs.mkdirSync(path.dirname(path.join(site, relative)), { recursive: true });
      fs.writeFileSync(path.join(site, relative), text);
    };
    plant("src/pages/clean.astro", "<p>Public summary without archive text.</p>");
    plant("public/notes/draft.html", `<ul><li>${syntheticLabel.replace(" - ", " &ndash; ")}</li></ul>`);
    plant("dist/assets/js/cache.js", `const draft=${JSON.stringify(syntheticSentence.replace("twelve", "\ntwelve"))};`);
    plant("public/assets/data/mission-log.enc.json", JSON.stringify({ note: syntheticLabel }));
    const result = runPublisher([validEntry()], output, { args: ["--check-leaks"] });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Leak check: possible Mission Log plaintext in public\/notes\/draft\.html \(entries: log-001 label\)/);
    assert.match(result.stderr, /Leak check: possible Mission Log plaintext in dist\/assets\/js\/cache\.js \(entries: log-001 body\)/);
    assert.match(result.stderr, /found possible Mission Log plaintext in 2 file\(s\)\. Nothing was written/);
    assert.doesNotMatch(result.stderr, /clean\.astro|mission-log\.enc\.json/);
    assert.equal(fs.existsSync(output), false);
    assertQuiet(result);
  });
});

test("--check-leaks passes on a tree without archive text", () => {
  withTempOutput((output) => {
    const site = path.join(path.dirname(output), "site");
    fs.mkdirSync(path.join(site, "src"), { recursive: true });
    fs.mkdirSync(path.join(site, "public"), { recursive: true });
    fs.writeFileSync(path.join(site, "src", "index.astro"), "<h1>Mission Log</h1><p>Entries remain behind the protected unlock flow.</p>");
    fs.writeFileSync(path.join(site, "public", "app.js"), "console.log('Mission Index');");
    const result = runPublisher([validEntry()], output, { args: ["--check-leaks"] });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Leak check: no entry labels or long body sentences found in 2 text files/);
    assert.deepEqual(decryptEntries(output), [validEntry()]);
    assertQuiet(result);
  });
});
