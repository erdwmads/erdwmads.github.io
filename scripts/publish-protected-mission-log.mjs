import fs from "node:fs";
import path from "node:path";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.env.MISSION_LOG_SOURCE ||
  "C:/Users/tsuku/Desktop/Grad Research/Orgueil Grad Data/Website Archive/mission-log.private.json";
const output = path.join(root, "public", "assets", "data", "mission-log.enc.json");
const passphrase = process.env.MISSION_LOG_PASSPHRASE;

if (!passphrase || passphrase.length < 16) {
  throw new Error("MISSION_LOG_PASSPHRASE must contain at least 16 characters");
}

const entries = JSON.parse(fs.readFileSync(source, "utf8"));
if (!Array.isArray(entries) || !entries.length) {
  throw new Error("Private Mission Log source must be a non-empty array");
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
fs.writeFileSync(output, JSON.stringify({
  version: 1,
  kdf: "PBKDF2-SHA-256",
  iterations,
  cipher: "AES-256-GCM",
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  ciphertext: Buffer.concat([ciphertext, tag]).toString("base64")
}));
