import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { pageRequestProblems } from "../src/lib/csp.mjs";

// Messages never include the passphrase, entry text or parser snippets of the private source.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.env.MISSION_LOG_SOURCE ||
  "C:/Users/tsuku/Desktop/Grad Research/Orgueil Grad Data/Website Archive/mission-log.private.json";
const output = path.resolve(process.env.MISSION_LOG_OUTPUT ||
  path.join(root, "public", "assets", "data", "mission-log.enc.json"));
const leakRoot = path.resolve(process.env.MISSION_LOG_LEAK_ROOT || root);
const passphrase = process.env.MISSION_LOG_PASSPHRASE;

let options;
try {
  ({ values: options } = parseArgs({
    args: process.argv.slice(2),
    options: { "rotate-passphrase": { type: "boolean" }, "check-leaks": { type: "boolean" } },
    strict: true,
    allowPositionals: false
  }));
} catch {
  // parseArgs would echo the offending argument, which could be a mistakenly typed passphrase.
  throw new Error("Unsupported arguments. Options: --rotate-passphrase, --check-leaks. Never pass the passphrase as an argument.");
}
const rotate = Boolean(options["rotate-passphrase"]);

if (!passphrase || passphrase.length < 16) {
  throw new Error("MISSION_LOG_PASSPHRASE must contain at least 16 characters");
}

let sourceText;
try {
  sourceText = fs.readFileSync(source, "utf8");
} catch (error) {
  throw new Error(`Cannot read the private Mission Log source at ${source} (${error?.code || "read error"})`);
}
let entries;
try {
  entries = JSON.parse(sourceText);
} catch {
  // JSON.parse messages quote the surrounding source text, so only the fact of the failure is reported.
  throw new Error("Private Mission Log source is not valid JSON");
}
if (!Array.isArray(entries) || !entries.length) {
  throw new Error("Private Mission Log source must be a non-empty array");
}

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const siteOrigin = "https://erdwmads.github.io";
const policyProblemNames = { external: "an external request", "inline-handler": "an inline event handler", "javascript-url": "a javascript: URL" };
const ids = new Set();
for (const [index, entry] of entries.entries()) {
  const prefix = `Mission Log entry ${index + 1}:`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry) || Object.getPrototypeOf(entry) !== Object.prototype) {
    throw new Error(`${prefix} entry must be a plain object`);
  }
  if (!isNonEmptyString(entry.id)) {
    throw new Error(`${prefix} id must be a non-empty string`);
  }
  if (ids.has(entry.id)) {
    throw new Error(`${prefix} id must be unique`);
  }
  ids.add(entry.id);
  if (!Number.isFinite(entry.number) || entry.number <= 0) {
    throw new Error(`${prefix} number must be a positive finite number`);
  }
  if (!isNonEmptyString(entry.isoDate) && !isNonEmptyString(entry.date)) {
    throw new Error(`${prefix} either isoDate or date must be a non-empty string`);
  }
  if (!isNonEmptyString(entry.label)) {
    throw new Error(`${prefix} label must be a non-empty string`);
  }
  if (!isNonEmptyString(entry.bodyHtml)) {
    throw new Error(`${prefix} bodyHtml must be a non-empty string`);
  }
  // The unlocked entries are inserted under the site's Content Security Policy (src/lib/csp.mjs), which blocks
  // off-site images and media, inline event handlers and javascript: URLs without a visible error. Plain links
  // (<a href>) and relative asset paths are fine. The message names the entry id and the problem kind, never the markup.
  for (const field of ["bodyHtml", "bodyHtmlJa"]) {
    if (typeof entry[field] !== "string") continue;
    const kinds = new Set(pageRequestProblems(entry[field], siteOrigin).map((problem) => problem.kind));
    if (kinds.size) {
      const described = [...kinds].map((kind) => policyProblemNames[kind] || "a blocked request").join(", ");
      throw new Error(`Mission Log entry ${entry.id}: ${field} has ${described}, which the site's Content Security Policy blocks. Serve images and media from this site and use plain links for other sites. Nothing was written.`);
    }
  }
}

const addThumbnailSources = (html) => html
  .replace(
    /(\s)src="assets\/img\/mission-log\/(grad-log-[^"]+)\.jpg"/gi,
    '$1src="assets/img/thumbs/mission-log/$2.webp"'
  )
  .replace(
    /(\s)data-thumb-src="assets\/img\/mission-log\/(grad-log-[^"]+)\.jpg"/gi,
    '$1data-thumb-src="assets/img/thumbs/mission-log/$2.webp"'
  );

const publishedEntries = entries.map((entry) => ({
  ...entry,
  bodyHtml: addThumbnailSources(entry.bodyHtml),
  ...(isNonEmptyString(entry.bodyHtmlJa) ? { bodyHtmlJa: addThumbnailSources(entry.bodyHtmlJa) } : {})
}));
const plaintext = JSON.stringify(publishedEntries);
const iterations = 600000;
const shownPath = (file, base = root) => {
  const relative = path.relative(base, file);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative.split(path.sep).join("/") : file;
};

// Mirrors the envelope rules of public/assets/js/research-lock.js, so an archive the browser would reject fails here too.
const openEnvelope = (text) => {
  const payload = JSON.parse(text);
  if (
    !payload || payload.version !== 1 || payload.kdf !== "PBKDF2-SHA-256" ||
    payload.cipher !== "AES-256-GCM" || payload.iterations !== iterations ||
    !["salt", "iv", "ciphertext"].every((key) => typeof payload[key] === "string")
  ) {
    throw new Error("invalid envelope");
  }
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const sealed = Buffer.from(payload.ciphertext, "base64");
  if (salt.length !== 16 || iv.length !== 12 || sealed.length <= 16) throw new Error("invalid envelope");
  return { salt, iv, sealed };
};
const decryptEnvelope = ({ salt, iv, sealed }) => {
  const decipher = createDecipheriv("aes-256-gcm", pbkdf2Sync(passphrase, salt, iterations, 32, "sha256"), iv);
  decipher.setAuthTag(sealed.subarray(-16));
  return Buffer.concat([decipher.update(sealed.subarray(0, -16)), decipher.final()]).toString("utf8");
};

// 1. The current archive must open with this passphrase, so a mistyped passphrase cannot silently replace it.
let existing = null;
try {
  existing = fs.readFileSync(output, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw new Error(`Cannot read the existing Mission Log payload at ${shownPath(output)} (${error?.code || "read error"})`);
}
let mode = "first publish";
if (existing !== null) {
  let envelope = null;
  try {
    envelope = openEnvelope(existing);
  } catch {}
  let opened = false;
  if (envelope) {
    try {
      decryptEnvelope(envelope);
      opened = true;
    } catch {}
  }
  if (opened) {
    mode = rotate ? "passphrase unchanged; --rotate-passphrase was not needed" : "passphrase confirmed against the existing archive";
  } else if (rotate) {
    mode = envelope ? "passphrase rotated" : "replaced a file that was not a valid payload";
  } else {
    throw new Error(envelope
      ? `This passphrase does not decrypt the existing Mission Log payload at ${shownPath(output)}. Nothing was written. Check the passphrase, or pass --rotate-passphrase only to change it deliberately.`
      : `The existing file at ${shownPath(output)} is not a valid Mission Log payload. Nothing was written. Pass --rotate-passphrase only to replace it deliberately.`);
  }
}

// 2. Optional in-memory leak scan: reports file paths and entry ids only, never the matched text.
let leakSummary = "";
if (options["check-leaks"]) {
  const namedEntities = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "\u2013", mdash: "\u2014", minus: "\u2212",
    micro: "\u00b5", deg: "\u00b0", times: "\u00d7", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", hellip: "\u2026"
  };
  const decodeEntities = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, name) => {
    if (name[0] !== "#") return namedEntities[name.toLowerCase()] ?? " ";
    const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : " ";
  });
  const stripTags = (text) => text.replace(/<[^>]*>/g, " ");
  const decodeEscapes = (text) => text
    .replace(/\\u([0-9a-f]{4})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\[nrtbf]/g, " ");
  // Letters and digits only, so markup, entities, escapes, punctuation and line wrapping cannot hide a match.
  const canonical = (text) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const needles = new Map();
  const addNeedle = (text, owner) => {
    const key = canonical(text);
    if (key.length < 12) return false;
    if (!needles.has(key)) needles.set(key, new Set());
    needles.get(key).add(owner);
    return true;
  };
  let shortLabels = 0;
  for (const entry of entries) {
    if (!addNeedle(entry.label, `${entry.id} label`)) shortLabels += 1;
    for (const html of [entry.bodyHtml, entry.bodyHtmlJa].filter(isNonEmptyString)) {
      decodeEntities(stripTags(html)).replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+|(?<=[\u3002\uff01\uff1f])/u)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 60)
        .forEach((sentence) => addNeedle(sentence, `${entry.id} body`));
    }
  }
  const textFile = /\.(?:astro|cjs|css|csv|htm|html|js|json|jsx|md|mdx|mjs|svg|ts|tsx|txt|webmanifest|xml|ya?ml)$/i;
  const sameFile = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
  const excluded = [output, ...["public", "dist"].map((dir) => path.join(leakRoot, dir, "assets", "data", "mission-log.enc.json"))];
  const listFiles = (dir) => {
    let dirents;
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    return dirents.flatMap((dirent) => {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) return dirent.name === "node_modules" || dirent.name === ".git" ? [] : listFiles(full);
      return dirent.isFile() && textFile.test(dirent.name) && !excluded.some((file) => sameFile(file, full)) ? [full] : [];
    });
  };
  const files = ["src", "public", "dist"].flatMap((dir) => listFiles(path.join(leakRoot, dir)));
  const findings = [];
  for (const file of files) {
    const text = decodeEscapes(fs.readFileSync(file, "utf8"));
    const variants = [canonical(decodeEntities(text)), canonical(decodeEntities(stripTags(text)))];
    const owners = new Set();
    for (const [needle, needleOwners] of needles) {
      if (variants.some((variant) => variant.includes(needle))) needleOwners.forEach((owner) => owners.add(owner));
    }
    if (owners.size) findings.push(`${shownPath(file, leakRoot)} (entries: ${[...owners].sort().join(", ")})`);
  }
  if (findings.length) {
    for (const finding of findings) console.error(`Leak check: possible Mission Log plaintext in ${finding}`);
    throw new Error(`Leak check found possible Mission Log plaintext in ${findings.length} file(s). Nothing was written.`);
  }
  leakSummary = `Leak check: no entry labels or long body sentences found in ${files.length} text files under src/, public/ and dist/` +
    (shortLabels ? ` (${shortLabels} label(s) too short to scan reliably).` : ".");
}

// 3. Encrypt, write to a sibling temporary file, then decrypt what was written before the atomic rename.
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(passphrase, salt, iterations, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([
  cipher.update(plaintext, "utf8"),
  cipher.final()
]);
const tag = cipher.getAuthTag();

fs.mkdirSync(path.dirname(output), { recursive: true });
const payload = JSON.stringify({
  version: 1,
  kdf: "PBKDF2-SHA-256",
  iterations,
  cipher: "AES-256-GCM",
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  ciphertext: Buffer.concat([ciphertext, tag]).toString("base64")
});
const temporaryOutput = path.join(
  path.dirname(output),
  `.${path.basename(output)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`
);

try {
  fs.writeFileSync(temporaryOutput, payload);
  let roundTrip = false;
  try {
    roundTrip = decryptEnvelope(openEnvelope(fs.readFileSync(temporaryOutput, "utf8"))) === plaintext;
  } catch {}
  if (!roundTrip) {
    throw new Error("Round-trip check failed: the new payload does not decrypt to the published entries. Nothing was written.");
  }
  fs.renameSync(temporaryOutput, output);
} finally {
  fs.rmSync(temporaryOutput, { force: true });
}

console.log(`Published ${publishedEntries.length} Mission Log ${publishedEntries.length === 1 ? "entry" : "entries"} to ${shownPath(output)} (${mode}; round-trip decrypt verified).`);
if (leakSummary) console.log(leakSummary);
