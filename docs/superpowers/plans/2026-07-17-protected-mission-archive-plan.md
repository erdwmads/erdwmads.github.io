# Protected Mission Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Mission Log plaintext from future public builds and decrypt a committed encrypted archive only after a valid passphrase is entered.

**Architecture:** The private source becomes a JSON file in the Grad Research workspace. A local publishing script encrypts it with PBKDF2-SHA-256 and AES-256-GCM and writes only a versioned encrypted payload to `public/assets/data`. The browser gate derives the key, decrypts in memory, and hands entries to the existing lazy Mission Index renderer.

**Tech Stack:** Astro 5, Node.js crypto, browser Web Crypto, vanilla JavaScript, GitHub Pages.

---

### Task 1: Add plaintext-leak regression checks

**Files:**
- Modify: `scripts/check-site.mjs`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Add failing checks**

```js
const forbiddenMissionPaths = [
  path.join(root, "src", "data", "missionLog.ts"),
  path.join(root, "src", "pages", "assets", "data", "mission-log.json.ts")
];
for (const forbiddenPath of forbiddenMissionPaths) {
  if (fs.existsSync(forbiddenPath)) {
    fail(`${path.relative(root, forbiddenPath)}: protected Mission Log plaintext must not be public source`);
  }
}

const generatedText = collectFiles(distDir)
  .filter((file) => textFilePattern.test(file))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
if (generatedText.includes("Mission Log 010 - SEM training")) {
  fail("dist: protected Mission Log plaintext leaked into the public build");
}
```

- [ ] **Step 2: Run the check and verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL for both current plaintext source files and the generated JSON.

- [ ] **Step 3: Commit the failing guard**

```powershell
git add scripts/check-site.mjs
git commit -m "test: guard protected mission plaintext"
```

### Task 2: Create the private source and encrypted publishing script

**Files:**
- Create outside repo: `C:/Users/tsuku/Desktop/Grad Research/Orgueil Grad Data/Website Archive/mission-log.private.json`
- Create: `scripts/publish-protected-mission-log.mjs`
- Create: `public/assets/data/mission-log.enc.json`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Build once and copy the current generated JSON to the private workspace**

Run:

```powershell
node .\node_modules\astro\astro.js build
New-Item -ItemType Directory -Force "C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive"
Copy-Item "dist\assets\data\mission-log.json" "C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json"
```

Expected: the private JSON contains 10 entries and LOG010.

- [ ] **Step 2: Add the publisher**

```js
import fs from "node:fs";
import path from "node:path";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
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
```

- [ ] **Step 3: Add the package command**

```json
"publish:mission-log": "node scripts/publish-protected-mission-log.mjs"
```

- [ ] **Step 4: Ignore accidental private copies**

```gitignore
mission-log.private.json
*.mission-log.private.json
```

- [ ] **Step 5: Generate the encrypted payload**

Run in a PowerShell process where `MISSION_LOG_PASSPHRASE` is set, without writing the passphrase to source or command history:

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run publish:mission-log
```

Expected: `public/assets/data/mission-log.enc.json` contains no Mission Log title or body text.

- [ ] **Step 6: Commit**

```powershell
git add .gitignore package.json scripts/publish-protected-mission-log.mjs public/assets/data/mission-log.enc.json
git commit -m "feat: publish encrypted mission archive"
```

### Task 3: Replace hash checking with authenticated decryption

**Files:**
- Modify: `public/assets/js/research-lock.js`
- Modify: `src/pages/research-graduation.astro`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Add a failing gate check**

```js
const researchLock = fs.readFileSync(researchLockPath, "utf8");
if (!researchLock.includes("AES-GCM") || !researchLock.includes("PBKDF2")) {
  fail("research-lock.js: protected archive must use PBKDF2 and AES-GCM decryption");
}
if (researchLock.includes("expectedHash")) {
  fail("research-lock.js: obsolete password hash gate must be removed");
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL because the current script uses `expectedHash`.

- [ ] **Step 3: Implement browser decryption**

```js
const fromBase64 = (value) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const decryptArchive = async (password) => {
  const response = await fetch("assets/data/mission-log.enc.json", { cache: "no-store" });
  if (!response.ok) throw new Error("archive-unavailable");
  const payload = await response.json();
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromBase64(payload.salt),
      iterations: payload.iterations
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext)
  );
  const entries = JSON.parse(new TextDecoder().decode(clear));
  if (!Array.isArray(entries)) throw new Error("invalid-archive");
  return entries;
};
```

On successful form submission, assign `window.MadsProtectedArchive = { entries }`, clear the input value, reveal the content, and dispatch `mads:research-unlocked`. On `pagehide`, delete the global archive object.

- [ ] **Step 4: Add the payload URL to the gate**

```astro
<section
  class="section research-lock-section"
  data-research-lock-gate
  data-protected-archive-url="assets/data/mission-log.enc.json"
>
```

- [ ] **Step 5: Run the check**

Run: `node scripts/check-site.mjs`

Expected: password-decryption checks PASS.

- [ ] **Step 6: Commit**

```powershell
git add public/assets/js/research-lock.js src/pages/research-graduation.astro scripts/check-site.mjs
git commit -m "feat: decrypt protected mission archive"
```

### Task 4: Feed decrypted entries into the existing lazy renderer

**Files:**
- Modify: `public/assets/js/mission-index.js`
- Modify: `src/components/MissionLogShell.astro`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Add a failing data-source guard**

```js
const missionIndex = fs.readFileSync(path.join(assetsDir, "js", "mission-index.js"), "utf8");
if (missionIndex.includes("assets/data/mission-log.json")) {
  fail("Mission Log UI must not request a plaintext archive");
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL because MissionLogShell still declares the plaintext URL.

- [ ] **Step 3: Read entries only from the decrypted in-memory object**

```js
const compareEntries = (a, b) => {
  const scoreDiff = dateScore(b.date || b.isoDate) - dateScore(a.date || a.isoDate);
  return scoreDiff || Number(b.number || 0) - Number(a.number || 0);
};

const loadMissionEntries = async () => {
  if (missionEntries.length) return missionEntries;
  const protectedEntries = window.MadsProtectedArchive?.entries;
  if (!Array.isArray(protectedEntries)) {
    throw new Error("Protected Mission Log is locked");
  }
  missionEntries = protectedEntries;
  byId = new Map(missionEntries.map((entry) => [entry.id, entry]));
  latestEntry = [...missionEntries].sort(compareEntries)[0] || null;
  return missionEntries;
};
```

Extract the existing sort body into `compareEntries`; do not change its date/number ordering.

- [ ] **Step 4: Remove the plaintext data URL**

Remove `data-mission-data-url` and keep `data-mission-auto-start="false"`.

- [ ] **Step 5: Run the check and manual unlock test**

Run: `node scripts/check-site.mjs`

Expected: PASS for the in-memory-only data source.

- [ ] **Step 6: Commit**

```powershell
git add public/assets/js/mission-index.js src/components/MissionLogShell.astro scripts/check-site.mjs
git commit -m "refactor: render decrypted mission entries"
```

### Task 5: Remove all future plaintext publication paths

**Files:**
- Delete: `src/data/missionLog.ts`
- Delete: `src/pages/assets/data/mission-log.json.ts`
- Modify: `scripts/check-site.mjs`
- Modify: `scripts/export-ppt-data.mjs`
- Modify: `docs/ui-invariants.md`
- Modify: `docs/content-workflow.md`

- [ ] **Step 1: Remove Mission Log imports and content from public PPT export**

Keep paper/public project data only. Do not emit `missionEntries`, `bodyHtml`, captions, or protected image metadata into `dist/ppt-data.json`.

- [ ] **Step 2: Delete both plaintext source routes and retire their positive checks**

Delete the two files only after the private JSON has been opened and checked for all 10 entries. In the same step, modify `scripts/check-site.mjs` to retire the positive assertions and unconditional reads/throws that require `src/data/missionLog.ts`, `src/pages/assets/data/mission-log.json.ts`, or the public `assets/data/mission-log.json` route. Keep the forbidden-path and generated-plaintext leak guards.

- [ ] **Step 3: Update maintenance documentation**

Document this exact flow:

```text
Edit private mission-log.private.json
Back up new original images to 事前準備
Run publish:mission-log with the passphrase in process memory
Run build and check:site
Commit only encrypted payload and public image derivatives
```

- [ ] **Step 4: Build and verify GREEN**

Run:

```powershell
node .\node_modules\astro\astro.js build
node scripts\export-ppt-data.mjs
node scripts\check-site.mjs
```

Expected: 9 pages pass, no plaintext source paths exist, and no LOG010 body text exists under `dist`.

Before running the commands, complete the `scripts/check-site.mjs` changes from Step 2 so the check no longer expects the removed plaintext publication paths or unconditionally reads their generated JSON.

- [ ] **Step 5: Commit**

```powershell
git add -A src/data/missionLog.ts src/pages/assets/data/mission-log.json.ts scripts/export-ppt-data.mjs docs/ui-invariants.md docs/content-workflow.md
git commit -m "security: remove public mission plaintext"
```

### Task 6: Correct stale public wording

**Files:**
- Modify: `src/legacy/research-main.html`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Add the failing copy check**

```js
if (researchPage.includes("local-only archive")) {
  fail("research.html: stale local-only Mission Log wording");
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL on stale wording.

- [ ] **Step 3: Replace the copy**

```html
<p class="muted">Detailed Mission Log records are available through the protected Research Log archive.</p>
```

- [ ] **Step 4: Build, check, and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add src/legacy/research-main.html scripts/check-site.mjs
git commit -m "fix: describe protected research archive"
```

### Task 7: Browser and leak verification

**Files:**
- No source changes unless a failing check identifies a defect.

- [ ] **Step 1: Verify public assets**

Confirm `/assets/data/mission-log.json` returns 404 and `/assets/data/mission-log.enc.json` contains no readable title, caption, body, or person name.

- [ ] **Step 2: Verify unlock behaviour**

At desktop and mobile widths, verify: wrong password leaves content hidden; correct passphrase loads 10 entries; navigation renders one log at a time; reload requires the password again.

- [ ] **Step 3: Verify no plaintext build leak**

Run:

```powershell
rg -n "Mission Log 010 - SEM training|Diamond wire saw dry cutting" dist public src
```

Expected: no hit in generated/public source. A hit in private Grad Research files is allowed.

- [ ] **Step 4: Commit any test-only refinements**

```powershell
git add scripts/check-site.mjs
git commit -m "test: verify protected archive boundaries"
```
