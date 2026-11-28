// The FX field and the orrery pause while Home's opaque opening plate covers the window (owner, 2026-11-28;
// public/assets/js/home-path.js reports mads:cover, power-manager.js publishes it, ambient-space.js and
// interface-2046.js pause as when the page is idle) and resume as the sheet rises:
// - at 1440 x 900, Space and Light, with the opening in view: html.mads-power-covered, the dust paused, no new meteor,
//   the orrery's tracks paused; the sky's own drift keeps running;
// - the pause cannot be seen: with every animation frozen, hiding the field and the orrery changes no pixel;
// - 30 % of a window down the cover has gone and both run again; back at the top they pause again;
// - on phones (the plate's foot is feathered, so the field shows through it) the cover never applies;
// - a soft navigation away clears it, and coming back to Home sets it again once the cross-fade has ended.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const sharp = createRequire(require.resolve("astro/package.json"))("sharp");
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || "http://127.0.0.1:52523";

async function open({ viewport, theme }) {
  const phone = viewport.width <= 760;
  const context = await browser.newContext({ viewport, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  await context.addInitScript((theme) => {
    localStorage.setItem("mads-theme", theme);
    sessionStorage.setItem("mads-cosmic-arrival-v1", "done");
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("backdrop-ready"), null, { timeout: 15000 });
  await page.waitForTimeout(3000);
  return { context, page, errors };
}

const state = (page) => page.evaluate(() => {
  const playing = (element) => element ? element.getAnimations().map((animation) => animation.playState) : [];
  return {
    covered: document.documentElement.classList.contains("mads-power-covered"),
    powerCovered: !!window.__madsPowerState?.covered,
    dust: playing(document.querySelector(".ambient-dust")),
    orbit: playing(document.querySelector(".ui2046-orbit-track")),
    sky: document.querySelector(".home-opening__sky")?.getAnimations().filter((animation) => animation.animationName === "open-drift").map((animation) => animation.playState) ?? [],
    fieldPaused: !!document.querySelector(".ambient-space-layer")?.classList.contains("ambient-paused")
  };
});

async function meteorsIn(page, ms) {
  return page.evaluate((ms) => new Promise((resolve) => {
    let count = 0;
    const layer = document.querySelector(".ambient-space-layer");
    const observer = new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) if (node.classList?.contains("ambient-meteor")) count++; });
    observer.observe(layer, { childList: true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, ms);
  }), ms);
}

async function pixelsDiffer(a, b) {
  const [x, y] = await Promise.all([a, b].map((png) => sharp(png).raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return Infinity;
  let differing = 0;
  for (let i = 0; i < x.data.length; i += x.info.channels) {
    if (Math.abs(x.data[i] - y.data[i]) > 2 || Math.abs(x.data[i + 1] - y.data[i + 1]) > 2 || Math.abs(x.data[i + 2] - y.data[i + 2]) > 2) differing++;
  }
  return differing;
}

try {
  for (const theme of ["space", "light"]) {
    const label = `${theme} 1440`;
    const { context, page, errors } = await open({ viewport: { width: 1440, height: 900 }, theme });
    let now = await state(page);
    assert.ok(now.covered && now.powerCovered, `${label}: the opening covers the window (${JSON.stringify(now)})`);
    assert.ok(now.fieldPaused && now.dust.length && now.dust.every((play) => play === "paused"), `${label}: the dust pauses under the plate`);
    assert.ok(now.orbit.length && now.orbit.every((play) => play === "paused"), `${label}: the orrery pauses under the plate`);
    assert.ok(now.sky.length && now.sky.every((play) => play === "running"), `${label}: the sky's own drift keeps running`);
    assert.equal(await meteorsIn(page, 2500), 0, `${label}: no meteor starts under the plate`);

    // Invisible: freeze every animation, then hide the field and the orrery; no pixel may change.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
    await page.waitForTimeout(200);
    const shown = await page.screenshot({ type: "png" });
    await page.evaluate(() => { for (const element of document.querySelectorAll(".ambient-space-layer, .ui2046-solar-system")) element.style.visibility = "hidden"; });
    await page.waitForTimeout(200);
    const hidden = await page.screenshot({ type: "png" });
    await page.evaluate(() => { for (const element of document.querySelectorAll(".ambient-space-layer, .ui2046-solar-system")) element.style.visibility = ""; });
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    assert.equal(await pixelsDiffer(shown, hidden), 0, `${label}: under the plate the field and the orrery cannot be seen`);

    // The sheet rises: the cover goes and both run; back at the top they pause again.
    await page.evaluate(() => window.scrollTo({ top: Math.round(innerHeight * .3), behavior: "instant" }));
    await page.waitForTimeout(400);
    now = await state(page);
    assert.ok(!now.covered && !now.powerCovered, `${label}: 30 % down the cover has gone`);
    assert.ok(!now.fieldPaused && now.dust.every((play) => play === "running") && now.orbit.every((play) => play === "running"), `${label}: the field and the orrery run again (${JSON.stringify(now)})`);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(400);
    assert.ok((await state(page)).covered, `${label}: back at the top the cover applies again`);

    if (theme === "space") {
      // A soft navigation away clears it; coming back to Home sets it again after the cross-fade.
      await page.click('.site-header a[href="research.html"]');
      await page.waitForFunction(() => document.body.classList.contains("ui-page-research") && !document.documentElement.dataset.backdropFade, null, { timeout: 8000 });
      now = await state(page);
      assert.ok(!now.covered && !now.powerCovered && !now.fieldPaused, `${label}: on Research nothing is covered (${JSON.stringify(now)})`);
      await page.goBack();
      await page.waitForFunction(() => document.body.classList.contains("ui-page-home") && !document.documentElement.dataset.backdropFade, null, { timeout: 8000 });
      await page.waitForTimeout(300);
      assert.ok((await state(page)).covered, `${label}: back on Home the cover applies again after the cross-fade`);
    }
    assert.deepEqual(errors, [], `${label}: page errors`);
    await context.close();
  }

  // Phones: the plate's foot is feathered, so the field shows through it and keeps running.
  {
    const { context, page, errors } = await open({ viewport: { width: 390, height: 844 }, theme: "space" });
    const now = await state(page);
    assert.ok(!now.covered && !now.powerCovered, `390: the cover never applies on phones (${JSON.stringify(now)})`);
    assert.deepEqual(errors, [], "390: page errors");
    await context.close();
  }
  console.log("opening-cover: pause under the plate, invisible, resume, soft navigation and phones pass");
} finally {
  await browser.close();
}
