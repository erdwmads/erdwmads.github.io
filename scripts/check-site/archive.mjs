// check-site/archive.mjs (owner WP6): the protected graduation page, the Mission Log scripts, their stylesheets and the
// encrypted payload. scripts/check-site.mjs runs every module in order. The lightbox geometry and the paused ambient
// layers behind it are checked in the browser (lightbox-geometry.browser), the ledger in mission-ledger.browser.
import fs from "node:fs";
import path from "node:path";
import { cssRules, hasDeclaration } from "../lib/css-rules.mjs";
import { folioStylesDir, read } from "../lib/site-paths.mjs";

export default async function checkArchive({ root, publicDir, assetsDir, fail, readDistPage, collectFiles }) {
  const missionThumbDir = path.join(assetsDir, "img", "thumbs", "mission-log");
  const encryptedMissionPayloadPath = path.join(publicDir, "assets", "data", "mission-log.enc.json");
  const missionThumbCount = collectFiles(missionThumbDir).filter((file) => file.endsWith(".webp")).length;

  // Every Mission Log display image needs its WebP thumbnail (npm run images:derive), and no thumbnail may be orphaned.
  const missionImages = fs.readdirSync(path.join(assetsDir, "img", "mission-log")).filter((name) => /^grad-log-.*\.jpg$/i.test(name));
  const missionThumbs = new Set(collectFiles(missionThumbDir).filter((file) => file.endsWith(".webp")).map((file) => path.basename(file, ".webp")));
  const missingThumbs = missionImages.filter((name) => !missionThumbs.has(name.replace(/\.jpg$/i, "")));
  // Public Mission Log images are display derivatives: at most 2400 px on the long edge and 1.5 MiB, no EXIF/XMP (APP1).
  function jpegInfo(buffer) {
    let offset = 2, exif = false;
    while (offset + 4 <= buffer.length && buffer[offset] === 0xff) {
      const marker = buffer[offset + 1];
      if (marker === 0xe1) exif = true;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), exif };
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
    return { width: 0, height: 0, exif };
  }
  for (const name of missionImages) {
    const file = path.join(assetsDir, "img", "mission-log", name);
    const { width, height, exif } = jpegInfo(fs.readFileSync(file));
    if (!width || Math.max(width, height) > 2400 || fs.statSync(file).size > 1.5 * 1024 * 1024 || exif) fail(`Mission Log: ${name} must be a display derivative (<= 2400 px long edge, <= 1.5 MiB, no EXIF/XMP)`);
  }
  if (missingThumbs.length || missionThumbCount !== missionImages.length) {
    fail(`Mission Log: ${missionImages.length} display images but ${missionThumbCount} WebP thumbnails${missingThumbs.length ? ` (missing ${missingThumbs.slice(0, 3).join(", ")})` : ""}`);
  }

  const requiredEncryptedMissionPayloadKeys = ["cipher", "ciphertext", "iterations", "iv", "kdf", "salt", "version"];
  if (!fs.existsSync(encryptedMissionPayloadPath)) {
    fail("public/assets/data/mission-log.enc.json: missing encrypted Mission Log payload");
  } else {
    try {
      const encryptedPayload = JSON.parse(fs.readFileSync(encryptedMissionPayloadPath, "utf8"));
      const payloadKeys = Object.keys(encryptedPayload).sort();
      if (JSON.stringify(payloadKeys) !== JSON.stringify(requiredEncryptedMissionPayloadKeys)) {
        fail("mission-log.enc.json: encrypted payload must use the exact supported envelope keys");
      }
      if (
        encryptedPayload.version !== 1 ||
        encryptedPayload.kdf !== "PBKDF2-SHA-256" ||
        encryptedPayload.cipher !== "AES-256-GCM" ||
        !Number.isInteger(encryptedPayload.iterations) ||
        encryptedPayload.iterations <= 0 ||
        !["salt", "iv", "ciphertext"].every((key) => typeof encryptedPayload[key] === "string" && encryptedPayload[key])
      ) {
        fail("mission-log.enc.json: encrypted payload envelope values are invalid");
      }
    } catch {
      fail("mission-log.enc.json: encrypted payload must be valid JSON");
    }
  }

  const graduationPage = readDistPage("research-graduation.html");
  if (!graduationPage.includes("assets/js/research-lock.js") || !graduationPage.includes("data-research-lock-gate") || !graduationPage.includes("data-research-lock-content")) {
    fail("research-graduation.html: missing password gate");
  }

  if (!graduationPage.includes('data-protected-archive-url="assets/data/mission-log.enc.json"')) {
    fail("research-graduation.html: missing protected Mission Log archive URL");
  }
  if (!graduationPage.includes('aria-describedby="research-lock-error"') || !graduationPage.includes('id="research-lock-error"') || !graduationPage.includes('role="alert"')) {
    fail("research-graduation.html: password errors must be announced to assistive technology");
  }
  if (!/<form\b(?=[^>]*data-research-lock-form)(?=[^>]*method="post")/i.test(graduationPage)) {
    fail("research-graduation.html: password form must use POST");
  }
  if (graduationPage.includes("assets/data/mission-log.json") || graduationPage.includes("data-mission-data-url")) {
    fail("research-graduation.html: Mission Log must not declare a plaintext data source");
  }
  if (!graduationPage.includes('data-mission-auto-start="false"')) {
    fail("research-graduation.html: Mission Log must wait for protected archive unlock");
  }
  if (!graduationPage.includes("assets/js/mission-index.js") || !graduationPage.includes("assets/js/mission-lightbox.js")) {
    fail("research-graduation.html: missing Mission Log scripts");
  }
  if (graduationPage.includes("Mission Log 009")) {
    fail("research-graduation.html: Mission Log entries must load after unlock, not in initial HTML");
  }

  // The viewer and the phone figures (components/lightbox.css), the entry body (components/mission-log.css).
  const lightboxCss = read(`${folioStylesDir}/components/lightbox.css`);
  const missionLogCss = read(`${folioStylesDir}/components/mission-log.css`);
  const rules = cssRules(lightboxCss + missionLogCss);
  const ruleFor = (selector) => rules.filter((entry) => entry.selectors.includes(selector));
  const declares = (selector, ...declarations) => declarations.every((declaration) => ruleFor(selector).some((entry) => hasDeclaration(entry, declaration)));
  if (!lightboxCss.includes("Mobile Mission Log: Disable Large Image Lightbox") || !declares("html.mobile-mission-lightbox-disabled .mission-lightbox", "display: none")) {
    fail("components/lightbox.css: the Mobile Mission Log: Disable Large Image Lightbox block must keep phone figures inline and hide the viewer");
  }
  if (!declares(".mission-lightbox", "visibility: hidden", "pointer-events: none", "background: var(--obs-screen)") || !declares(".mission-lightbox.is-open", "visibility: visible")) {
    fail("components/lightbox.css: the viewer must stay invisible and inert until it opens, on the screen ground in both themes");
  }
  if (/backdrop-filter/i.test(lightboxCss)) {
    fail("components/lightbox.css: the Mission Log viewer must not use live backdrop blur");
  }
  if (!declares(".mission-lightbox__captionbar", "grid-template-columns: minmax(0, 1fr) auto") || ruleFor(".mission-lightbox__captionbar").some((entry) => hasDeclaration(entry, "position: fixed"))) {
    fail("components/lightbox.css: the caption must reserve a wrapping column below the image instead of overlaying it");
  }
  if (!declares(".mission-log-entry .research-note-body", "min-width: 0", "width: 100%", "max-width: 100%")) {
    fail("components/mission-log.css: the Mission Log body must not retain a desktop intrinsic width on mobile");
  }
  // The sealed panel reserves the passkey block, and the Mission Index summary carries no archive count before unlock.
  if (!/data-passkey-controls data-reserve-space hidden/.test(graduationPage) || !/data-passkey-setup data-reserve-space hidden/.test(graduationPage)) {
    fail("research-graduation.html: the passkey block and setup button must reserve their space (data-reserve-space)");
  }
  if (!/<details class="mission-ledger">/.test(graduationPage) || /\b\d+ records?\b/.test(graduationPage)) {
    fail("research-graduation.html: the Mission Index must be a ledger disclosure whose server copy names no record count");
  }

  const researchLockPath = path.join(assetsDir, "js", "research-lock.js");
  if (!fs.existsSync(researchLockPath)) {
    fail("research-lock.js: missing graduation password gate script");
  } else {
    const researchLock = fs.readFileSync(researchLockPath, "utf8");
    if (!researchLock.includes("AES-GCM") || !researchLock.includes("PBKDF2")) {
      fail("research-lock.js: protected archive must use PBKDF2 and AES-GCM decryption");
    }
    if (researchLock.includes("expectedHash")) {
      fail("research-lock.js: obsolete password hash gate must be removed");
    }
    // The status line reserves the height of the longest load-time message, so the copy in the markup must be one of
    // the script's messages, word for word.
    const reserveText = graduationPage.match(/data-reserve-text="([^"]+)"/)?.[1];
    if (!reserveText || !researchLock.includes(`'${reserveText}'`)) {
      fail("research-graduation.html: the passkey status line's data-reserve-text must repeat research-lock.js's longest load-time message");
    }
    if (researchLock.includes("1029384756Y")) {
      fail("research-lock.js: must not contain the plain password");
    }
    if (/\b(sessionStorage|localStorage)\b/.test(researchLock)) {
      fail("research-lock.js: must request the password on each page entry, without browser storage unlock caching");
    }
    if (!researchLock.includes("sessionNotice?.focus?.({ preventScroll: true })") || !researchLock.includes("'Mission Log unlocked · '")) {
      fail("research-lock.js: unlock must focus the session notice that states the record count");
    }
  }
  const missionIndexPath = path.join(assetsDir, "js", "mission-index.js");
  const missionIndex = fs.readFileSync(missionIndexPath, "utf8");
  if (missionIndex.includes("assets/data/mission-log.json")) {
    fail("mission-index.js: Mission Log UI must not request a plaintext archive");
  }
  if (/\bfetch\s*\(/.test(missionIndex) || missionIndex.includes("dataEl") || missionIndex.includes("mission-log-data")) {
    fail("mission-index.js: Mission Log entries must only come from the protected in-memory archive");
  }
  for (const protectedUiScript of ["research-lock.js", "mission-index.js", "mission-lightbox.js"]) {
    const scriptPath = path.join(assetsDir, "js", protectedUiScript);
    if (!fs.existsSync(scriptPath)) {
      fail(`${protectedUiScript}: missing protected Mission Log UI script`);
      continue;
    }
    const script = fs.readFileSync(scriptPath, "utf8");
    if (script.includes("assets/data/mission-log.json") || script.includes("assets/img/mission-log/")) {
      fail(`${protectedUiScript}: protected UI scripts must not contain a plaintext Mission Log URL`);
    }
  }
  const missionLogShell = fs.readFileSync(path.join(root, "src", "components", "MissionLogShell.astro"), "utf8");
  if (missionLogShell.includes("assets/data/mission-log.json") || missionLogShell.includes("data-mission-data-url")) {
    fail("MissionLogShell.astro: Mission Log must not declare a plaintext data source");
  }
  const missionLightbox = fs.readFileSync(path.join(assetsDir, "js", "mission-lightbox.js"), "utf8");
  if (missionLightbox.includes("mission-lightbox__thumbs") || missionLightbox.includes("buildThumbs")) {
    fail("mission-lightbox.js: full-screen viewer must not render thumbnail strip");
  }
  if (!missionLightbox.includes("emitLightboxPowerState") || !missionLightbox.includes("document.documentElement.classList.add('mission-lightbox-open')")) {
    fail("mission-lightbox.js: opening the viewer must pause background rendering through the shared lightbox state");
  }
  if (
    missionLightbox.includes("mission-lightbox__panel") ||
    missionLightbox.includes("mission-lightbox__info") ||
    missionLightbox.includes("mission-lightbox__title") ||
    missionLightbox.includes("mission-lightbox__kicker")
  ) {
    fail("mission-lightbox.js: image viewer must use minimal image-first layout without side information panel");
  }
  if (!missionLightbox.includes("mobile-mission-lightbox-disabled") || !missionLightbox.includes("if (locked || isTouch) return;") || !missionLightbox.includes("setBackgroundInert(true)")) {
    fail("mission-lightbox.js: phones keep inline figures (no viewer buttons) and the open viewer makes the page behind it inert");
  }
  if (/data-mission-index-list[^>]*aria-live/.test(missionLogShell)) {
    fail("MissionLogShell.astro: the Mission Index must not be a live region; unlock moves focus to the session notice instead");
  }
  if (fs.existsSync(path.join(root, "src", "legacy", "research-graduation-inline-scripts.html"))) {
    fail("src/legacy/research-graduation-inline-scripts.html: unused fragment must stay deleted; the phone guard lives in mission-lightbox.js");
  }
}
