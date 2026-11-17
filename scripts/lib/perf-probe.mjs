// Loading-performance probe for the Folio 2046 gate (spec §6.6, §7.4): loads pages of the built site in Edge with a
// 4x CPU slowdown and a throttled network (Chrome DevTools Protocol), and records Largest Contentful Paint, Cumulative
// Layout Shift and the bytes of web fonts and the stylesheet. Text responses are served gzipped, as GitHub Pages does.
// Each page and width loads in a fresh browser context (cold cache), several times; the summary keeps the median LCP
// and font bytes and the largest CLS.
//   node scripts/lib/perf-probe.mjs                         print a run of the baseline set
//   node scripts/lib/perf-probe.mjs --write                 record it as docs/perf-baseline.json
//   node scripts/lib/perf-probe.mjs --compare               compare with docs/perf-baseline.json (exit 1 on a regression)
// Options: --pages index,research  --widths 390,1440  --runs 3  --theme space|light  --out <file>  --tolerance 0.1
// Needs a fresh build in dist/, Playwright (PLAYWRIGHT_MODULE) and Edge (scripts/lib/browser.mjs).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser.mjs";
import { root } from "./site-paths.mjs";
import { distBuilt, serveDist } from "./static-server.mjs";

export const baselinePath = path.join(root, "docs", "perf-baseline.json");
export const defaultPages = ["index", "research", "paper-shelf", "origins-study"];
export const defaultWidths = [390, 1440];
// Lighthouse's mobile profile: 4x CPU slowdown, 150 ms round trip, 1.6 Mbit/s down, 750 kbit/s up.
export const throttling = { cpuSlowdown: 4, latencyMs: 150, downloadBytesPerSecond: 200000, uploadBytesPerSecond: 93750 };

const viewportFor = (width) => (width < 700
  ? { viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
  : { viewport: { width, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

// CLS as browsers report it: the largest session window of shifts without recent input (gaps under 1 s, at most 5 s).
function sessionWindowCls(shifts) {
  let best = 0, current = 0, windowStart = 0, last = -Infinity;
  for (const { value, startTime } of shifts) {
    if (startTime - last > 1000 || startTime - windowStart > 5000) { current = 0; windowStart = startTime; }
    current += value;
    last = startTime;
    best = Math.max(best, current);
  }
  return best;
}

async function loadOnce(browser, url, width, theme) {
  const context = await browser.newContext(viewportFor(width));
  await context.addInitScript((theme) => {
    try {
      sessionStorage.setItem("mads-cosmic-arrival-v1", "done");
      if (theme) localStorage.setItem("mads-theme", theme);
    } catch {}
    window.__probe = { lcp: null, shifts: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const element = entry.element;
        const name = element ? `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList?.[0] ? `.${element.classList[0]}` : ""}` : "(removed)";
        window.__probe.lcp = { startTime: entry.startTime, size: entry.size, element: name, url: entry.url ? entry.url.split("/").pop() : "" };
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__probe.shifts.push({ value: entry.value, startTime: entry.startTime });
    }).observe({ type: "layout-shift", buffered: true });
  }, theme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: throttling.latencyMs, downloadThroughput: throttling.downloadBytesPerSecond, uploadThroughput: throttling.uploadBytesPerSecond });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttling.cpuSlowdown });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 180000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const result = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      const fonts = resources.filter((entry) => /\.woff2(?:[?#]|$)/.test(entry.name)).map((entry) => ({ file: new URL(entry.name).pathname.split("/").pop(), bytes: entry.encodedBodySize }));
      const stylesheet = resources.find((entry) => /\/assets\/css\/site\.css/.test(entry.name));
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        lcp: window.__probe.lcp,
        shifts: window.__probe.shifts,
        fonts,
        stylesheetBytes: stylesheet ? stylesheet.encodedBodySize : 0,
        transferBytes: Math.round([navigation, ...resources].reduce((sum, entry) => sum + (entry?.transferSize || 0), 0))
      };
    });
    return {
      lcpMs: Math.round(result.lcp?.startTime ?? -1),
      lcpElement: result.lcp ? `${result.lcp.element}${result.lcp.url ? ` (${result.lcp.url})` : ""}` : "none",
      cls: Number(sessionWindowCls(result.shifts).toFixed(4)),
      fontBytes: result.fonts.reduce((sum, font) => sum + font.bytes, 0),
      fonts: result.fonts.sort((a, b) => a.file.localeCompare(b.file)),
      stylesheetBytes: result.stylesheetBytes,
      transferBytes: result.transferBytes
    };
  } finally {
    await context.close();
  }
}

// Returns { generated, throttling, runs, theme, results: [{ page, width, lcpMs, cls, fontBytes, ... , runs: [...] }] }.
export async function probe({ pages = defaultPages, widths = defaultWidths, runs = 3, theme = "", log = () => {} } = {}) {
  if (!distBuilt()) throw new Error("Build the site first; the probe loads dist/.");
  const server = await serveDist({ gzip: true });
  const browser = await launchBrowser();
  const results = [];
  try {
    for (const page of pages) {
      for (const width of widths) {
        const samples = [];
        for (let run = 0; run < runs; run++) samples.push(await loadOnce(browser, `${server.url}/${page}.html`, width, theme));
        const lcpValues = samples.map((sample) => sample.lcpMs);
        const typical = samples[lcpValues.indexOf(median(lcpValues))] ?? samples[0];
        const summary = {
          page,
          width,
          lcpMs: Math.round(median(lcpValues)),
          lcpElement: typical.lcpElement,
          cls: Math.max(...samples.map((sample) => sample.cls)),
          fontBytes: Math.round(median(samples.map((sample) => sample.fontBytes))),
          fonts: typical.fonts,
          stylesheetBytes: typical.stylesheetBytes,
          transferBytes: Math.round(median(samples.map((sample) => sample.transferBytes))),
          runs: samples.map(({ lcpMs, cls, fontBytes }) => ({ lcpMs, cls, fontBytes }))
        };
        results.push(summary);
        log(`${page} @${width}: LCP ${summary.lcpMs} ms (${summary.lcpElement}), CLS ${summary.cls}, fonts ${summary.fontBytes} B, stylesheet ${summary.stylesheetBytes} B`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return { generated: new Date().toISOString(), throttling, runs, theme: theme || "default (Space)", results };
}

// Regressions of a probe against a baseline: LCP above the baseline by more than the tolerance, CLS above 0 or above
// the baseline, whichever is larger. Pages missing from the baseline are reported, not failed.
export function compare(current, baseline, tolerance = 0.1) {
  const lines = [], regressions = [];
  for (const result of current.results) {
    const before = baseline.results.find((entry) => entry.page === result.page && entry.width === result.width);
    if (!before) { lines.push(`${result.page} @${result.width}: no baseline`); continue; }
    const lcpLimit = Math.round(before.lcpMs * (1 + tolerance));
    const line = `${result.page} @${result.width}: LCP ${before.lcpMs} -> ${result.lcpMs} ms (limit ${lcpLimit}), CLS ${before.cls} -> ${result.cls}, fonts ${before.fontBytes} -> ${result.fontBytes} B`;
    lines.push(line);
    if (result.lcpMs > lcpLimit || result.cls > Math.max(0, before.cls)) regressions.push(line);
  }
  return { lines, regressions };
}

async function main(argv) {
  const option = (name, fallback) => { const index = argv.indexOf(`--${name}`); return index >= 0 ? argv[index + 1] : fallback; };
  const list = (value, fallback) => (value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback);
  const current = await probe({
    pages: list(option("pages"), defaultPages).map((page) => page.replace(/\.html$/, "")),
    widths: list(option("widths"), defaultWidths).map(Number),
    runs: Number(option("runs", 3)),
    theme: option("theme", ""),
    log: (line) => console.log(line)
  });
  const out = option("out", argv.includes("--write") ? baselinePath : "");
  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(current, null, 2)}\n`);
    console.log(`Wrote ${path.relative(root, out).split(path.sep).join("/")}`);
  }
  if (argv.includes("--compare")) {
    const baseline = JSON.parse(fs.readFileSync(option("baseline", baselinePath), "utf8"));
    const { lines, regressions } = compare(current, baseline, Number(option("tolerance", 0.1)));
    lines.forEach((line) => console.log(line));
    if (regressions.length) {
      console.error(`${regressions.length} regression(s) against the baseline`);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
