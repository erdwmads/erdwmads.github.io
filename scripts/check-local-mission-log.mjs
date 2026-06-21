import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localDir = path.join(root, "_local", "mission-log");
const pagePath = path.join(localDir, "research-graduation.html");
const localSourcePath = path.join(root, "_local", "mission-source", "missionLog.ts");
const localAssetDir = path.join(root, "_local", "mission-assets", "img");
const outputAssetDir = path.join(localDir, "assets", "img");

const failures = [];

function fail(message) {
  failures.push(message);
}

if (!fs.existsSync(pagePath)) {
  fail("_local/mission-log/research-graduation.html: missing local Mission Log page");
}
if (!fs.existsSync(localSourcePath)) {
  fail("_local/mission-source/missionLog.ts: missing local Mission Log source data");
}

const html = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, "utf8") : "";

if (html && !html.includes("mission-log-data")) {
  fail("local Mission Log page: missing Mission Log JSON data");
}
if (html && !html.includes("assets/js/mission-index.js")) {
  fail("local Mission Log page: missing Mission Log navigator script");
}
if (html && !html.includes("assets/js/mission-lightbox.js")) {
  fail("local Mission Log page: missing Mission Log lightbox script");
}
if (html && html.includes("https://images.weserv.nl/")) {
  fail("local Mission Log page: must not depend on remote image proxy URLs");
}
if (html && html.includes("data-research-lock-gate")) {
  fail("local Mission Log page: should open directly without the public password gate");
}

const dataMatch = html.match(/<script\b[^>]*id="mission-log-data"[^>]*>([\s\S]*?)<\/script>/);
let missionData = [];
if (dataMatch) {
  try {
    missionData = JSON.parse(dataMatch[1]);
  } catch (error) {
    fail(`local Mission Log page: Mission Log JSON is not parseable: ${error.message}`);
  }
}

if (missionData.length !== 8) {
  fail(`local Mission Log page: expected 8 entries, found ${missionData.length}`);
}

const expectedImages = fs.existsSync(localAssetDir)
  ? fs.readdirSync(localAssetDir).filter((name) => /^grad-log-.*\.jpg$/i.test(name)).sort()
  : [];

if (expectedImages.length !== 38) {
  fail(`_local/mission-assets/img: expected 38 Mission Log images, found ${expectedImages.length}`);
}

for (const imageName of expectedImages) {
  if (!fs.existsSync(path.join(outputAssetDir, imageName))) {
    fail(`local Mission Log output: missing copied image ${imageName}`);
  }
  if (html && !html.includes(`assets/img/${imageName}`)) {
    fail(`local Mission Log page: does not reference ${imageName}`);
  }
}

if (failures.length) {
  console.error("Local Mission Log check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Local Mission Log check passed: ${missionData.length} entries and ${expectedImages.length} local images.`);
