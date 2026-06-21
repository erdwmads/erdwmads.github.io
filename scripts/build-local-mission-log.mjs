import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const astroCli = path.join(root, "node_modules", "astro", "astro.js");
const localSource = path.join(root, "_local", "mission-source", "missionLog.ts");
const sourceDir = path.join(root, "_local", "mission-assets", "img");
const outputDir = path.join(root, "_local", "mission-log");
const outputImageDir = path.join(outputDir, "assets", "img");
const outputPage = path.join(outputDir, "research-graduation.html");

if (!fs.existsSync(astroCli)) {
  console.error(`Astro CLI not found: ${astroCli}`);
  process.exit(1);
}

if (!fs.existsSync(localSource)) {
  console.error(`Local Mission Log source not found: ${localSource}`);
  process.exit(1);
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Local Mission Log image folder not found: ${sourceDir}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [astroCli, "build", "--config", "astro.local-mission.config.mjs"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" }
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

fs.mkdirSync(outputImageDir, { recursive: true });

const imageNames = fs
  .readdirSync(sourceDir)
  .filter((name) => /^grad-log-.+\.jpg$/i.test(name))
  .sort();

for (const name of imageNames) {
  fs.copyFileSync(path.join(sourceDir, name), path.join(outputImageDir, name));
}

console.log(`Local Mission Log images copied: ${imageNames.length}`);
console.log(`Local Mission Log page: ${outputPage}`);
console.log(pathToFileURL(outputPage).toString());
