// check-site/shell.mjs (owner WP2): header, navigation, theme toggle, Interface 2046, FX and power scripts, and the
// shell rules of the served stylesheet bundle. scripts/check-site.mjs runs every module in order. Layout itself (the
// header bands, the phone sheet, the spine) is checked in the browser: site-control-clearance, reading-ui, site-header
// and site-audit; the stylesheet mechanics are in scripts/style-contract/shell.mjs.
import fs from "node:fs";
import path from "node:path";
import { cssRules } from "../lib/css-rules.mjs";
import { bundleDist, readShell, shell } from "../lib/site-paths.mjs";

const compact = (text) => text.replace(/\s+/g, "").toLowerCase();

export default async function checkShell({ root, assetsDir, fail, readDistPage }) {
  const homePage = readDistPage("index.html");
  if (!homePage.includes('<button class="theme-toggle" type="button" aria-label="Switch to Light Mode">Light Mode</button>')) {
    fail("index.html: theme toggle must name its action, match the default Space theme and carry no aria-pressed");
  }

  const homeHeaderMatch = homePage.match(/<header\b[^>]*class="[^"]*\bsite-header\b[^"]*"[^>]*>[\s\S]*?<\/header>/i);
  if (!homeHeaderMatch) {
    fail("index.html: missing site header");
  } else {
    const homeHeaderHtml = homeHeaderMatch[0];
    const homeNavMatch = homeHeaderHtml.match(/<nav\b[^>]*class="[^"]*\bnav\b[^"]*"[^>]*>[\s\S]*?<\/nav>/i);
    const headerActionsMatch = homeHeaderHtml.match(/<div\b[^>]*class="[^"]*\bheader-actions\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/header>/i);
    if (!homeNavMatch) {
      fail("index.html: missing main navigation");
    }
    if (!headerActionsMatch) {
      fail("index.html: missing header-actions wrapper");
    }
    if (homeNavMatch) {
      const homeNavHtml = homeNavMatch[0];
      const ordinaryLinksMatch = homeNavHtml.match(/<div\b[^>]*class="[^"]*\bnav__links\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (!ordinaryLinksMatch) {
        fail("index.html: ordinary navigation links must be grouped inside nav__links");
      } else if (/href="research-log\.html"[\s\S]*?>\s*Research Log\s*</i.test(ordinaryLinksMatch[1])) {
        fail("index.html: Research Log must be separated from ordinary navigation links");
      }
      if (/\bnav-log-gate\b/i.test(homeNavHtml)) {
        fail("index.html: Research Log gate must be outside the ordinary nav dock");
      }
      if (/\btheme-toggle\b/i.test(homeNavHtml)) {
        fail("index.html: theme toggle must be outside the ordinary nav dock");
      }
    }
    if (!/<a\b(?=[^>]*href="research-log\.html")(?=[^>]*class="[^"]*\bnav-log-gate\b)[^>]*>[\s\S]*?Research Log[\s\S]*?Active Archive[\s\S]*?<\/a>/i.test(homeHeaderHtml)) {
      fail("index.html: missing independent Research Log gate in the header");
    }
    if (!/<button\b(?=[^>]*class="[^"]*\btheme-toggle\b)[^>]*>/i.test(homeHeaderHtml)) {
      fail("index.html: missing theme toggle in the header actions");
    }
  }

  const researchLogHeader = readDistPage("research-log.html");
  if (!/<body\b[^>]*class="[^"]*\bui-page-research-log\b/i.test(researchLogHeader)) {
    fail("research-log.html: body must expose ui-page-research-log for page-specific design");
  }
  if (!/<a\b(?=[^>]*href="research-log\.html")(?=[^>]*class="[^"]*\bnav-log-gate\b)(?=[^>]*aria-current="page")[^>]*>/i.test(researchLogHeader)) {
    fail("research-log.html: independent Research Log gate must show the active state");
  }

  const shellSource = readShell();
  if (!shellSource.includes("data-nav-toggle") || !shellSource.includes("data-mobile-nav")) {
    fail(`${shell.name}: missing compact mobile navigation contract`);
  }

  const interface2046 = fs.readFileSync(path.join(assetsDir, "js", "interface-2046.js"), "utf8");
  if (!interface2046.includes("data-ui2046-route") || !interface2046.includes("mads:soft-nav-ready")) {
    fail("interface-2046.js: missing soft navigation route refresh");
  }
  if (!interface2046.includes("MOBILE_INTERFACE_MEDIA") || !interface2046.includes("mads-mobile-lite") || !interface2046.includes("removeInterfaceLayers")) {
    fail("interface-2046.js: mobile lightweight mode must skip the solar-system/interface layer");
  }
  if (!interface2046.includes("mads:fx-state") || !interface2046.includes("syncOrbitalSystem")) {
    fail("interface-2046.js: orbital system must mount only while ambient FX is enabled");
  }

  const researchCoordinates = fs.readFileSync(path.join(assetsDir, "js", "research-coordinates.js"), "utf8");
  // Owner decision E136: the readout lives in the Visual effects panel at every width (the dock, or the phone menu),
  // never loose in the page.
  if (researchCoordinates.includes("MOBILE_COORDINATES_MEDIA") || !researchCoordinates.includes("getElementById('obs-fx-panel')") || !researchCoordinates.includes("removeCoordinates")) {
    fail("research-coordinates.js: the coordinates readout must join the Visual effects panel at every width, phones included (E136)");
  }
  if (!researchCoordinates.includes('location.pathname.includes("ryugu-bennu")') || !researchCoordinates.includes('mode = "Comparison"') || researchCoordinates.includes('phase = "Dolomite"') || researchCoordinates.includes("sample-cabinet")) {
    fail("research-coordinates.js: HUD must label Ryugu & Bennu as a comparison, default to Ca–Mg carbonate and drop Sample Cabinet");
  }
  if (researchCoordinates.includes("6ﾃ・")) {
    fail("research-coordinates.js: photography camera label contains mojibake");
  }

  const collapsibleNavigationMedia = "(max-width: 760px)";
  // The served bundle: the phone header switches at the width site-header.js uses, and the sheet is laid out by width
  // alone, in the page flow: never over the content, never by pointer type.
  const bundleFile = path.join(root, bundleDist);
  const bundle = fs.existsSync(bundleFile) ? fs.readFileSync(bundleFile, "utf8") : "";
  if (!bundle) {
    fail(`${bundleDist}: missing; the shell checks read the built stylesheet bundle`);
  } else {
    const rules = cssRules(bundle);
    const phoneMenu = rules.some((rule) => rule.conditions.some((condition) => compact(condition) === compact(`@media ${collapsibleNavigationMedia}`)) && rule.selectors.some((selector) => /\.nav-toggle$/.test(selector)));
    if (!phoneMenu) fail(`site.css: the Menu button must appear at @media ${collapsibleNavigationMedia}, the breakpoint of site-header.js`);
    const sheet = rules.filter((rule) => rule.selectors.some((selector) => /\.header-actions$/.test(selector)));
    if (sheet.some((rule) => rule.declarations.some((declaration) => declaration.property === "position" && /absolute|fixed/.test(declaration.value)))) {
      fail("site.css: the phone navigation sheet must open in the page flow, not over the page content");
    }
    if (sheet.some((rule) => rule.conditions.some((condition) => /pointer|hover/.test(condition)))) {
      fail("site.css: the header layout must follow the window width, not the pointer type");
    }
    // The page backdrops (components/backdrop.css) are named by the bundle only: Bennu's two tiers (the Research page's
    // picture since 2026-11-28) and the solar-system band.
    for (const name of ["asteroid-bennu-1280.webp", "asteroid-bennu-800.webp", "Solar_System_true_color-1600.webp"]) {
      if (!["", '"', "'"].some((quote) => bundle.includes(`url(${quote}../img/${name}${quote})`))) fail(`site.css: the page backdrop url("../img/${name}") is missing`);
    }
    // Each page's picture (2026-11-28, components/backdrop.css) is a luminance mask: every mask the bundle names exists
    // (ten pictures at 1600 and 800 px), and none is ever a background image (a picture painted as one would be text's
    // ground and an LCP candidate).
    const masks = [...new Set([...bundle.matchAll(/url\(["']?\.\.\/img\/(backdrops\/[\w-]+-mask-\d+\.webp)["']?\)/g)].map((match) => match[1]))];
    if (masks.length < 20) fail(`site.css: expected ten page pictures at two widths each, found ${masks.length} mask urls`);
    for (const mask of masks) if (!fs.existsSync(path.join(assetsDir, "img", mask))) fail(`site.css: the page picture mask assets/img/${mask} is missing`);
    if (/background(?:-image)?\s*:[^;}]*(?:backdrops\/|asteroid-bennu)/.test(bundle)) fail("site.css: a page picture is used as a background image; each page draws its picture as a mask only");
  }
  for (const name of ["asteroid-bennu.jpg", "asteroid-bennu-1280.webp", "asteroid-bennu-800.webp", "Solar_System_true_color.jpg", "Solar_System_true_color-1600.webp"]) {
    if (!fs.existsSync(path.join(assetsDir, "img", name))) fail(`assets/img/${name}: the page backdrop (or its source) is missing`);
  }
  // A backdrop is never preloaded and never an <img>: no built page names one. The footer's credit line links the
  // montage's Commons page, whose address carries the file name (owner decision, 2026-11-18), so it is set aside.
  const distDir = path.join(root, "dist");
  for (const file of fs.readdirSync(distDir).filter((name) => name.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(distDir, file), "utf8").replace(/<p class="footer-credits"[^>]*>[\s\S]*?<\/p>/, "");
    if (/asteroid-bennu(?:-\d+)?\.(?:webp|jpg)|Solar_System_true_color\.|backdrops\/[\w-]+-mask-/.test(html)) fail(`dist/${file}: names a page backdrop or a far plate mask (both are CSS only, never preloaded)`);
  }

  const siteHeaderScript = fs.readFileSync(path.join(assetsDir, "js", "site-header.js"), "utf8");
  if (!siteHeaderScript.includes(`const COLLAPSIBLE_NAVIGATION_MEDIA = "${collapsibleNavigationMedia}"`)) {
    fail("site-header.js: navigation state must use the same narrow-window breakpoint as CSS");
  }

  const ambientSpace = fs.readFileSync(path.join(assetsDir, "js", "ambient-space.js"), "utf8");
  if (!ambientSpace.includes("mission-lightbox-open") || !fs.readFileSync(path.join(assetsDir, "js", "interface-2046.js"), "utf8").includes("mission-lightbox-open")) {
    fail("ambient/interface scripts: Mission Log lightbox must pause background animation loops while open");
  }
  // Owner decision E103: phones run the lite field (no pebbles, built after load), never the full one.
  if (!ambientSpace.includes("MOBILE_AMBIENT_MEDIA") || !ambientSpace.includes("isMobileAmbientView") || !ambientSpace.includes("const pebbleCount = isMobileAmbient ? 0 : 20;") || !ambientSpace.includes('"ambient-space-layer is-lite"')) {
    fail("ambient-space.js: phones must run the lite ambient field (E103)");
  }
  const powerManager = fs.readFileSync(path.join(assetsDir, "js", "power-manager.js"), "utf8");
  const lowPowerBlock = powerManager.match(/const LOW_POWER_MEDIA = \[([\s\S]*?)\];/)?.[1] || "";
  if (lowPowerBlock.includes("max-width") || lowPowerBlock.includes("pointer: coarse")) {
    fail("power-manager.js: mobile viewports must not be classified as low power");
  }
  if (!powerManager.includes("const MOBILE_MEDIA")) {
    fail("power-manager.js: missing separate mobile media state");
  }
}
