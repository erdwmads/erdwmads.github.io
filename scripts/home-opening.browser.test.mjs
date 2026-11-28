// The Home opening (owner decision of 2026-11-28: direction A, "Comet opening", with direction B's imprint;
// src/styles/folio/pages/home-opening.css, public/assets/js/home-path.js), in both themes at 1440 x 900 and 390 x 844:
// - the opening fills the first window (100svh): its foot is the window's foot, and the sky covers the whole window;
// - the first window holds the h1, the imprint, the question, the cue and the credit, and no part of the path below;
// - the h1 is the Largest Contentful Paint, and the plate never is, even after it has developed;
// - under reduced motion no scroll-driven animation runs, the band and the running head wait while the name is in view
//   (html[data-home-opening]) and come back once it has gone; without reduced motion the band waits by scroll;
// - a block already in view when the page opens does not set in; a block reached by scrolling does.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || "http://127.0.0.1:52523";
const sizes = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const plate = /comet-mcnaught-(opening|ink)/;

async function open({ viewport, theme, reducedMotion = "no-preference" }) {
  const phone = viewport.width <= 760;
  const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  await context.addInitScript((theme) => {
    localStorage.setItem("mads-theme", theme);
    sessionStorage.setItem("mads-cosmic-arrival-v1", "done");
    window.__lcp = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const element = entry.element;
        window.__lcp.push({ url: entry.url || "", id: element?.id || "", tag: element?.tagName || "", className: typeof element?.className === "string" ? element.className : "" });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/index.html`, { waitUntil: "load" });
  return { context, page, errors };
}

try {
  for (const theme of ["space", "light"]) {
    for (const viewport of sizes) {
      const label = `${theme} ${viewport.width}`;
      const { context, page, errors } = await open({ viewport, theme });
      // The plate develops after load and idle (html.backdrop-ready) over 1.8 s; wait until it is painted.
      await page.waitForFunction(() => document.documentElement.classList.contains("backdrop-ready"), null, { timeout: 15000 });
      await page.waitForTimeout(2600);
      const state = await page.evaluate(() => {
        const box = (selector) => { const rect = document.querySelector(selector)?.getBoundingClientRect(); return rect && { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height }; };
        const print = getComputedStyle(document.querySelector(".home-opening__sky"), "::before").backgroundImage;
        return { opening: box(".home-opening"), sky: box(".home-opening__sky"), h1: box("#home-name"), imprint: box(".home-opening__imprint"), line: box(".home-opening__line"), cue: box(".home-opening__cue"), credit: box(".home-opening__credit"), title: box(".home-title"), print, imprintText: document.querySelector(".home-opening__imprint")?.textContent.replace(/\s+/g, " ").trim(), lineText: document.querySelector(".home-opening__line")?.textContent.trim(), footerQuestion: document.querySelector(".footer-question__text")?.textContent.trim(), h1Text: document.querySelector("h1")?.textContent.trim(), h1Count: document.querySelectorAll("main h1").length, inOpening: document.querySelector("#home-name")?.closest(".home-opening") !== null, labelledBy: document.querySelector(".home-opening")?.getAttribute("aria-labelledby"), lcp: window.__lcp, vw: innerWidth, vh: innerHeight };
      });
      // The opening fills the first window; the sky covers it entirely (so its picture is a background, never the LCP).
      assert.ok(Math.abs(state.opening.bottom - state.vh) <= 1, `${label}: the opening ends at the window's foot (${state.opening.bottom} of ${state.vh})`);
      assert.ok(state.sky.top <= 0 && state.sky.bottom >= state.vh && state.sky.left <= 0 && state.sky.right >= state.vw, `${label}: the sky covers the window (${JSON.stringify(state.sky)})`);
      assert.match(state.print, plate, `${label}: the developed plate is the comet print`);
      // The first window: the name, the imprint, the question, the cue and the credit; the path starts below it.
      assert.equal(state.h1Text, "I. Mads Lieu");
      assert.equal(state.h1Count, 1, `${label}: one h1`);
      assert.ok(state.inOpening && state.labelledBy === "home-name", `${label}: the h1 names the opening`);
      assert.equal(state.imprintText, "Astromineralogy research archive · Interface 2046", `${label}: the entrance's imprint`);
      assert.equal(state.lineText, state.footerQuestion, `${label}: the opening's line is the footer's long-term question`);
      for (const part of ["h1", "imprint", "line", "cue", "credit"]) assert.ok(state[part].top >= 0 && state[part].bottom <= state.vh, `${label}: ${part} lies in the first window`);
      assert.ok(state.title.top >= state.vh - 1, `${label}: the who block starts below the first window`);
      // The h1 is the LCP; no LCP candidate is ever the plate.
      const last = state.lcp.at(-1);
      assert.ok(last && last.id === "home-name" && !last.url, `${label}: the h1 is the LCP (${JSON.stringify(state.lcp)})`);
      assert.ok(state.lcp.every((entry) => !plate.test(entry.url) && !/home-opening__sky/.test(entry.className)), `${label}: the plate is never the LCP (${JSON.stringify(state.lcp)})`);
      // Desktop: the band, the orbit trace and the running head wait over the opening and come back after it.
      if (viewport.width > 760) {
        const band = () => page.evaluate(() => Number(getComputedStyle(document.body, "::after").opacity));
        assert.equal(await band(), 0, `${label}: no band over the opening`);
        await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2));
        await page.waitForTimeout(400);
        assert.ok(await band() > .5, `${label}: the band is back after the opening`);
      }
      assert.deepEqual(errors, [], `${label}: page errors`);
      await context.close();
    }
  }

  // Reduced motion: the same composition at rest, nothing scroll-driven; the band and the running head still wait.
  for (const viewport of sizes) {
    const { context, page, errors } = await open({ viewport, theme: "space", reducedMotion: "reduce" });
    await page.waitForTimeout(600);
    const scrollDriven = () => page.evaluate(() => document.getAnimations().filter((animation) => animation.timeline && !(animation.timeline instanceof DocumentTimeline)).map((animation) => `${animation.animationName || animation.id} on ${animation.effect?.target?.className || "?"}${animation.effect?.pseudoElement || ""}`));
    assert.deepEqual(await scrollDriven(), [], `${viewport.width}: no scroll-driven animation under reduced motion`);
    const opening = () => page.evaluate(() => document.documentElement.dataset.homeOpening);
    await page.waitForFunction(() => document.documentElement.dataset.homeOpening === "in", null, { timeout: 5000 });
    const shown = () => page.evaluate(() => ({ band: Number(getComputedStyle(document.body, "::after").opacity), rail: document.querySelector(".ui2046-rail") ? Number(getComputedStyle(document.querySelector(".ui2046-rail")).opacity) : null }));
    if (viewport.width > 760) {
      const atRest = await shown();
      assert.equal(atRest.band, 0, `${viewport.width}: the band waits over the opening under reduced motion`);
      if (atRest.rail !== null) assert.equal(atRest.rail, 0, `${viewport.width}: the running head waits over the opening under reduced motion`);
    }
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.5));
    await page.waitForFunction(() => document.documentElement.dataset.homeOpening === "out", null, { timeout: 5000 });
    assert.equal(await opening(), "out");
    if (viewport.width > 760) assert.ok((await shown()).band > .5, `${viewport.width}: the band is back once the name has gone`);
    assert.deepEqual(await scrollDriven(), [], `${viewport.width}: still no scroll-driven animation after scrolling`);
    assert.deepEqual(errors, [], `${viewport.width} reduced: page errors`);
    await context.close();
  }

  // Without reduced motion the opening is scroll-driven (the sky, the lockup), and the path's blocks set in once: a
  // block reached by scrolling sets in, never from hidden; a block already in view when the script runs (a reload part
  // way down, or soft navigation back to Home, which runs the page script again) is left alone.
  {
    const { context, page, errors } = await open({ viewport: { width: 1440, height: 900 }, theme: "space" });
    await page.waitForTimeout(600);
    const driven = await page.evaluate(() => document.getAnimations().filter((animation) => animation.timeline && !(animation.timeline instanceof DocumentTimeline)).length);
    assert.ok(driven >= 4, `the opening answers the scroll (${driven} scroll-driven animations)`);
    const rows = () => page.evaluate(() => [...document.querySelectorAll(".home-explore-list > li")].map((row) => ({ moving: row.getAnimations().length > 0, opacity: Number(getComputedStyle(row).opacity) })));
    await page.locator(".home-explore").scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const setting = await rows();
    assert.ok(setting.some((row) => row.moving), "Explore sets in when it is reached");
    assert.ok(Math.min(...setting.map((row) => row.opacity)) >= .35, `a setting-in row is never hidden (${JSON.stringify(setting)})`);
    await page.waitForTimeout(1800);
    await page.evaluate(() => new Promise((resolve) => { const script = document.createElement("script"); script.src = document.querySelector("script[src*=\"home-path.js\"]").src; script.onload = resolve; document.body.append(script); }));
    await page.waitForTimeout(500);
    assert.ok((await rows()).every((row) => !row.moving && row.opacity === 1), "a block already in view is left alone");
    assert.deepEqual(errors, [], "set-in page errors");
    await context.close();
  }
  console.log("Home opening: fills the first window at 1440 and 390 in both themes, the h1 is the LCP and the plate never is, reduced motion runs nothing scroll-driven, set-ins skip what is already in view.");
} finally {
  await browser.close();
}
