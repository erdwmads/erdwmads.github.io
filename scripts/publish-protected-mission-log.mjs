import fs from "node:fs";
import path from "node:path";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.env.MISSION_LOG_SOURCE ||
  "C:/Users/tsuku/Desktop/Grad Research/Orgueil Grad Data/Website Archive/mission-log.private.json";
const output = process.env.MISSION_LOG_OUTPUT ||
  path.join(root, "public", "assets", "data", "mission-log.enc.json");
const passphrase = process.env.MISSION_LOG_PASSPHRASE;

if (!passphrase || passphrase.length < 16) {
  throw new Error("MISSION_LOG_PASSPHRASE must contain at least 16 characters");
}

const entries = JSON.parse(fs.readFileSync(source, "utf8"));
if (!Array.isArray(entries) || !entries.length) {
  throw new Error("Private Mission Log source must be a non-empty array");
}

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
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
}

const salt = randomBytes(16);
const iv = randomBytes(12);
const iterations = 600000;
const key = pbkdf2Sync(passphrase, salt, iterations, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([
  cipher.update(JSON.stringify(entries), "utf8"),
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
  fs.renameSync(temporaryOutput, output);
} finally {
  fs.rmSync(temporaryOutput, { force: true });
}
