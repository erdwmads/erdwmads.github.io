# Image Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Photography and Mission Log pages from downloading full-resolution images for thumbnails and inactive content.

**Architecture:** A deterministic Sharp script creates committed WebP derivatives. Photography stores image metadata in one data module, emits thumbnail URLs separately from full URLs, and hydrates only the active and adjacent full images. Mission Log body HTML is rewritten during private publishing to add thumbnail sources while retaining full-image paths.

**Tech Stack:** Astro 5, Sharp 0.34, vanilla JavaScript, WebP.

---

### Task 1: Add derivative-generation checks

**Files:**
- Modify: `scripts/check-site.mjs`
- Modify: `scripts/audit-images.mjs`

- [ ] **Step 1: Add failing checks**

```js
const photoThumbDir = path.join(assetsDir, "img", "thumbs", "photography");
const missionThumbDir = path.join(assetsDir, "img", "thumbs", "mission-log");
if (collectFiles(photoThumbDir).filter((file) => file.endsWith(".webp")).length !== 21) {
  fail("Photography: expected 21 WebP thumbnails");
}
if (collectFiles(missionThumbDir).filter((file) => file.endsWith(".webp")).length !== 55) {
  fail("Mission Log: expected 55 WebP thumbnails");
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL because neither derivative directory exists.

- [ ] **Step 3: Commit**

```powershell
git add scripts/check-site.mjs scripts/audit-images.mjs
git commit -m "test: require image derivatives"
```

### Task 2: Generate deterministic WebP derivatives

**Files:**
- Create: `scripts/generate-image-derivatives.mjs`
- Modify: `package.json`
- Create: `public/assets/img/thumbs/photography/*.webp`
- Create: `public/assets/img/thumbs/mission-log/*.webp`

- [ ] **Step 1: Verify the Astro installation exposes Sharp**

Run:

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' -e "import('sharp').then(() => console.log('sharp-ready'))"
```

Expected: `sharp-ready`. Astro already provides Sharp in this repository, so this task must not add a second lockfile or alter dependency resolution.

- [ ] **Step 2: Create the generator**

```js
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const imageRoot = path.join(root, "public", "assets", "img");

const jobs = [
  {
    inputs: Array.from({ length: 21 }, (_, index) => ({
      source: path.join(imageRoot, `photo (${index + 1}).jpg`),
      output: path.join(imageRoot, "thumbs", "photography", `photo-${String(index + 1).padStart(2, "0")}.webp`)
    })),
    width: 480,
    quality: 78
  },
  {
    inputs: fs.readdirSync(path.join(imageRoot, "mission-log"))
      .filter((name) => /^grad-log-.*\.jpg$/i.test(name))
      .map((name) => ({
        source: path.join(imageRoot, "mission-log", name),
        output: path.join(imageRoot, "thumbs", "mission-log", name.replace(/\.jpg$/i, ".webp"))
      })),
    width: 720,
    quality: 80
  }
];

for (const group of jobs) {
  for (const job of group.inputs) {
    fs.mkdirSync(path.dirname(job.output), { recursive: true });
    await sharp(job.source)
      .rotate()
      .resize({ width: group.width, withoutEnlargement: true })
      .webp({ quality: group.quality })
      .toFile(job.output);
  }
}
```

- [ ] **Step 3: Add the package command and generate**

```json
"images:derive": "node scripts/generate-image-derivatives.mjs"
```

Run:

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run images:derive
```

Expected: 21 Photography and 55 Mission Log WebP thumbnails.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
node scripts\check-site.mjs
git add package.json scripts/generate-image-derivatives.mjs public/assets/img/thumbs
git commit -m "perf: generate image thumbnails"
```

### Task 3: Make Photography data-driven and lazy

**Files:**
- Create: `src/data/photography.ts`
- Create: `src/components/PhotographyGallery.astro`
- Modify: `src/pages/photography.astro`
- Modify: `public/assets/js/photography.js`
- Delete: `src/legacy/photography-main.html`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Add a failing generated-page check**

```js
const photographyPage = readDistPage("photography.html");
if (!photographyPage.includes('data-full-src="assets/img/photo%20%281%29.jpg"')) {
  fail("Photography: missing separate full-image source");
}
if (!photographyPage.includes("assets/img/thumbs/photography/photo-01.webp")) {
  fail("Photography: missing derivative thumbnail source");
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL because full and thumbnail sources are not separated.

- [ ] **Step 3: Create the metadata source**

```ts
export const photographs = Array.from({ length: 21 }, (_, index) => {
  const number = index + 1;
  const encoded = `photo%20%28${number}%29.jpg`;
  return {
    number,
    full: `assets/img/${encoded}`,
    thumb: `assets/img/thumbs/photography/photo-${String(number).padStart(2, "0")}.webp`,
    alt: `Photograph ${number}`
  };
});
```

- [ ] **Step 4: Render active image, dormant slides, thumbnails, and marquee**

The active slide receives `src={photo.full}`. Inactive slides receive `src={photo.thumb}`, `data-full-src={photo.full}`, `loading="lazy"`, and `decoding="async"`. Filmstrip and marquee images use `photo.thumb` only.

- [ ] **Step 5: Hydrate current and adjacent images**

```js
function hydrate(index) {
  const slide = slides[(index + slides.length) % slides.length];
  const fullSrc = slide?.dataset.fullSrc;
  if (slide && fullSrc && slide.src !== new URL(fullSrc, document.baseURI).href) {
    slide.src = fullSrc;
    slide.dataset.fullHydrated = "true";
  }
}

function show(index) {
  current = (index + slides.length) % slides.length;
  hydrate(current);
  hydrate(current - 1);
  hydrate(current + 1);
  // Preserve the existing active classes, counter, stage background, and autoplay reset.
}
```

- [ ] **Step 6: Build, check, and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add src/data/photography.ts src/components/PhotographyGallery.astro src/pages/photography.astro public/assets/js/photography.js scripts/check-site.mjs
git rm src/legacy/photography-main.html
git commit -m "perf: lazy load photography originals"
```

### Task 4: Add Mission Log thumbnail sources during protected publishing

**Files:**
- Modify: `scripts/publish-protected-mission-log.mjs`
- Modify: `public/assets/js/mission-lightbox.js`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Add a failing encrypted-source integration check**

Add a publisher unit mode that accepts `--dry-run` and prints only entry/image counts. The site check runs it with a fixture and requires every `mission-thumb-img` to contain distinct `src` and `data-full-src` values.

- [ ] **Step 2: Rewrite protected body HTML before encryption**

```js
const addThumbnailSources = (html) => html.replace(
  /src="assets\/img\/mission-log\/(grad-log-[^"]+)\.jpg"\s+data-full-src="([^"]+)"/g,
  'src="assets/img/thumbs/mission-log/$1.webp" data-full-src="$2"'
);
```

Apply it to `bodyHtml` and `bodyHtmlJa` on a cloned entry object before encryption.

- [ ] **Step 3: Preserve full-size-on-open behaviour**

Verify `mission-lightbox.js` reads `data-full-src`; do not change viewer layout, captions, keyboard controls, or mobile lightbox disabling.

- [ ] **Step 4: Regenerate, build, check, and commit**

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run publish:mission-log
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add scripts/publish-protected-mission-log.mjs public/assets/data/mission-log.enc.json public/assets/js/mission-lightbox.js scripts/check-site.mjs
git commit -m "perf: serve mission thumbnails"
```

### Task 5: Browser network verification

**Files:**
- No source changes unless verification fails.

- [ ] **Step 1: Photography initial load**

At 390x844 and 1440x900, verify the initial request set contains one active full JPEG plus WebP thumbnails, not all 21 full JPEGs.

- [ ] **Step 2: Photography navigation**

Click next and previous. Verify adjacent originals hydrate before display, counters remain correct, and no blank frame appears.

- [ ] **Step 3: Mission Log**

Unlock, select LOG010, and confirm the card grid uses WebP derivatives. Open a desktop image and confirm the viewer switches to the original JPEG.

- [ ] **Step 4: Record audit**

Run:

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run audit:images
```

Expected: derivative counts pass and original files remain untouched.
