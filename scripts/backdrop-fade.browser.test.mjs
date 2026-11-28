// The backdrop cross-fade on soft navigation (owner, 2026-11-28; public/assets/js/legacy-navigation.js,
// src/styles/folio/components/backdrop.css):
// - research → ryugu-bennu at 1440 x 900, Space: at most one extra layer at any frame; it holds the old picture (Bennu)
//   while the new one (Ryugu) develops from nothing to its resting strength over 600 to 1400 ms (760 ms eased, after
//   the new picture has decoded); afterwards no layer and no data-backdrop-fade remain; focus lands on the new h1;
// - it shifts nothing: no layout shift without recent input once the page has swapped, and no entry names the layer;
// - back and forward show the right picture each time, with the fade, and leave no layer behind;
// - Home: leaving with the opening in view, the layer is the opening plate (its print) just under main; arriving, the
//   sky develops from nothing over the old picture and Home's own picture is Comet West; scrolled past the opening,
//   Comet West (owner, 2026-11-28) is the picture that dissolves, and going back to Home develops it again;
// - phones (390 x 844) fade with the upright files;
// - reduced motion and FX off: no layer and no data-backdrop-fade at any frame; the picture swaps with the page.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || "http://127.0.0.1:52523";

async function open(path, { viewport = { width: 1440, height: 900 }, theme = "space", reducedMotion = "no-preference", fx = true } = {}) {
  const phone = viewport.width <= 760;
  const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  await context.addInitScript(({ theme, fx }) => {
    localStorage.setItem("mads-theme", theme);
    if (!fx) localStorage.setItem("madsAmbientFxEnabled", "0");
    sessionStorage.setItem("mads-cosmic-arrival-v1", "done");
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__shifts.push({ value: entry.value, recent: entry.hadRecentInput, time: entry.startTime, sources: (entry.sources || []).map((source) => source.node?.className || source.node?.nodeName || "") });
    }).observe({ type: "layout-shift", buffered: true });
    addEventListener("mads:soft-nav-end", () => { window.__navEnd = performance.now(); });
  }, { theme, fx });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/${path}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("backdrop-ready"), null, { timeout: 15000 });
  await page.waitForTimeout(2600);
  return { context, page, errors };
}

// Samples every frame from now until the layer has gone and the page has settled (or 4 s).
async function startSampling(page) {
  await page.evaluate(() => {
    window.__samples = [];
    window.__navEnd = 0;
    const start = performance.now();
    const tick = () => {
      const layers = [...document.querySelectorAll(".backdrop-fade")];
      const layer = layers[0], picture = getComputedStyle(document.body, "::before"), sky = document.querySelector("main .home-opening__sky");
      const layerStyle = layer && getComputedStyle(layer);
      window.__samples.push({
        t: performance.now() - start,
        layers: layers.length,
        plate: !!layer?.classList.contains("backdrop-fade--plate"),
        layerOpacity: layerStyle ? Number(layerStyle.opacity) : null,
        layerPicture: layerStyle ? `${layerStyle.maskImage} ${layerStyle.backgroundImage}` : "",
        layerZ: layerStyle ? layerStyle.zIndex : "",
        layerBeforeMain: layer ? layer.nextElementSibling === document.querySelector("main") : false,
        picture: picture.maskImage,
        pictureOpacity: Number(picture.opacity),
        attr: document.documentElement.dataset.backdropFade || "",
        sky: sky ? Number(getComputedStyle(sky).opacity) : null,
        page: (document.body.className.match(/ui-page-[\w-]+/) || [""])[0]
      });
      const last = window.__samples.at(-1);
      if (performance.now() - start < 4000 && !(window.__navEnd && last.layers === 0 && !last.attr && performance.now() - window.__navEnd > 300)) requestAnimationFrame(tick);
      else window.__sampled = true;
    };
    window.__sampled = false;
    requestAnimationFrame(tick);
  });
}
async function samples(page) {
  await page.waitForFunction(() => window.__sampled, null, { timeout: 8000 });
  return page.evaluate(() => window.__samples);
}
const file = (url) => (url.match(/[\w-]+\.webp/) || [""])[0];

function checkFade(label, list, { from, to, rest }) {
  assert.ok(list.every((s) => s.layers <= 1), `${label}: at most one extra layer at any frame`);
  const withLayer = list.filter((s) => s.layers === 1);
  assert.ok(withLayer.length > 10, `${label}: the old picture moved onto a layer (${withLayer.length} frames)`);
  assert.ok(withLayer.every((s) => file(s.layerPicture) === from || s.layerPicture.includes(from)), `${label}: the layer holds the old picture ${from}`);
  const swapped = list.filter((s) => file(s.picture) === to);
  assert.ok(swapped.length, `${label}: the page shows ${to}`);
  const firstSwap = swapped[0];
  assert.ok(firstSwap.pictureOpacity < .05, `${label}: the new picture starts from nothing (${firstSwap.pictureOpacity})`);
  const fading = withLayer.filter((s) => s.layerOpacity < withLayer[0].layerOpacity - .001);
  assert.ok(fading.length, `${label}: the layer dissolves`);
  const duration = withLayer.at(-1).t - fading[0].t;
  assert.ok(duration >= 600 && duration <= 1400, `${label}: the dissolve takes 600 to 1400 ms (${Math.round(duration)} ms)`);
  const last = list.at(-1);
  assert.equal(last.layers, 0, `${label}: no layer is left`);
  assert.equal(last.attr, "", `${label}: no data-backdrop-fade is left`);
  assert.equal(file(last.picture), to, `${label}: the new picture stays`);
  assert.ok(Math.abs(last.pictureOpacity - rest) < .01, `${label}: the new picture rests at ${rest} (${last.pictureOpacity})`);
}

async function navigate(page, href) {
  await page.click(`.site-header a[href="${href}"]`);
}

try {
  // Research → Ryugu & Bennu, then back and forward.
  {
    const { context, page, errors } = await open("research.html");
    const rest = await page.evaluate(() => Number(getComputedStyle(document.body, "::before").opacity));
    await startSampling(page);
    await navigate(page, "ryugu-bennu.html");
    const forward = await samples(page);
    checkFade("research → ryugu-bennu", forward, { from: "asteroid-bennu-1280.webp", to: "asteroid-ryugu-mask-1600.webp", rest: .42 });
    assert.ok(Math.abs(rest - .42 * .6) < .01, `research rests at .42 × .6 (${rest})`);
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("main h1")), true, "focus lands on the new h1");
    const shifts = await page.evaluate(() => window.__shifts.filter((entry) => entry.time > window.__navEnd - 1));
    assert.deepEqual(shifts.filter((entry) => !entry.recent || entry.sources.some((name) => /backdrop-fade/.test(name))), [], "no layout shift once the page has swapped, and none from the layer");

    await startSampling(page);
    await page.goBack();
    const back = await samples(page);
    checkFade("back to research", back, { from: "asteroid-ryugu-mask-1600.webp", to: "asteroid-bennu-1280.webp", rest: .42 * .6 });
    assert.equal(back.at(-1).page, "ui-page-research", "back: the research page");

    await startSampling(page);
    await page.goForward();
    const again = await samples(page);
    checkFade("forward to ryugu-bennu", again, { from: "asteroid-bennu-1280.webp", to: "asteroid-ryugu-mask-1600.webp", rest: .42 });
    assert.deepEqual(errors, [], "page errors");
    await context.close();
  }

  // Home's opening plate, leaving and arriving.
  {
    const { context, page, errors } = await open("index.html");
    await startSampling(page);
    await navigate(page, "research.html");
    const leaving = await samples(page);
    const plateFrames = leaving.filter((s) => s.layers === 1);
    assert.ok(plateFrames.length > 10 && plateFrames.every((s) => s.plate && /comet-mcnaught-opening/.test(s.layerPicture)), "leaving Home: the layer is the opening plate");
    assert.ok(plateFrames.every((s) => s.layerBeforeMain && s.layerZ === "3"), "leaving Home: the plate's layer lies just under main, above the field");
    assert.ok(plateFrames[0].layerOpacity > .99, "leaving Home: the plate starts at full strength");
    assert.equal(leaving.at(-1).layers, 0, "leaving Home: no layer is left");

    await startSampling(page);
    await page.goBack();
    const arriving = await samples(page);
    const skyFrames = arriving.filter((s) => s.sky !== null);
    assert.ok(skyFrames.length && skyFrames[0].sky < .05, `arriving at Home: the sky develops from nothing (${skyFrames[0]?.sky})`);
    assert.ok(skyFrames.at(-1).sky > .99, "arriving at Home: the sky reaches full strength");
    assert.ok(arriving.some((s) => s.layers === 1 && file(s.layerPicture) === "asteroid-bennu-1280.webp"), "arriving at Home: the old picture dissolves under it");
    assert.equal(file(arriving.at(-1).picture), "comet-west-mask-1600.webp", "arriving at Home: its own picture is Comet West");
    assert.deepEqual(errors, [], "page errors");
    await context.close();
  }

  // Home past the opening: its own picture, Comet West, dissolves into Research's, and back again.
  {
    const { context, page, errors } = await open("index.html");
    // Far enough that none of the plate shows (its sky lingers, fading, while the sheet rises).
    await page.evaluate(() => scrollTo(0, document.querySelector(".home-opening").getBoundingClientRect().bottom + scrollY + innerHeight));
    await page.waitForFunction(() => { const sky = document.querySelector("main .home-opening__sky"), box = sky.getBoundingClientRect(); return box.bottom <= 0 || box.top >= innerHeight || Number(getComputedStyle(sky).opacity) === 0; });
    await page.waitForTimeout(400);
    await startSampling(page);
    await navigate(page, "research.html");
    checkFade("Home past the opening → research", await samples(page), { from: "comet-west-mask-1600.webp", to: "asteroid-bennu-1280.webp", rest: .252 });
    await startSampling(page);
    await page.goBack();
    const back = await samples(page);
    assert.ok(back.some((s) => s.layers === 1 && file(s.layerPicture) === "asteroid-bennu-1280.webp"), "back to Home: Research's picture dissolves");
    assert.equal(file(back.at(-1).picture), "comet-west-mask-1600.webp", "back to Home: Comet West is the page's picture again");
    assert.equal(back.at(-1).layers, 0, "back to Home: no layer is left");
    assert.deepEqual(errors, [], "page errors");
    await context.close();
  }

  // Phones: the upright files.
  {
    const { context, page, errors } = await open("research.html", { viewport: { width: 390, height: 844 } });
    await startSampling(page);
    await page.evaluate(() => document.querySelector('a[href="ryugu-bennu.html"]').click());
    const list = await samples(page);
    checkFade("phone research → ryugu-bennu", list, { from: "asteroid-bennu-800.webp", to: "asteroid-ryugu-mask-800.webp", rest: .26 });
    assert.deepEqual(errors, [], "page errors");
    await context.close();
  }

  // Reduced motion and FX off: an instant swap.
  for (const [label, options] of [["reduced motion", { reducedMotion: "reduce" }], ["FX off", { fx: false }]]) {
    const { context, page, errors } = await open("research.html", options);
    await startSampling(page);
    await navigate(page, "ryugu-bennu.html");
    const list = await samples(page);
    assert.ok(list.every((s) => s.layers === 0 && !s.attr), `${label}: no layer and no data-backdrop-fade at any frame`);
    const swapFrame = list.find((s) => s.page === "ui-page-ryugu-bennu");
    assert.ok(swapFrame && file(swapFrame.picture) === "asteroid-ryugu-mask-1600.webp", `${label}: the picture swaps with the page`);
    assert.deepEqual(errors, [], `${label}: page errors`);
    await context.close();
  }
  console.log("backdrop-fade: cross-fade, layout, back and forward, Home plate, phones, reduced motion and FX off pass");
} finally {
  await browser.close();
}
