// Soft navigation must leave every page with the same body ui-page-* classes and header aria-current
// state as a direct load: both now come only from the server-rendered page (LegacyShell.astro).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:4322';
// Each page is reached from the one before it; the protected archive through Research Log's own link.
const route = [
  { page: 'index.html', classes: ['ui-page-home'], current: 'index.html' },
  { page: 'research.html', classes: ['ui-page-research'], current: 'research.html' },
  { page: 'ryugu-bennu.html', classes: ['ui-page-ryugu-bennu'], current: 'ryugu-bennu.html' },
  { page: 'origins-study.html', classes: ['ui-page-origins'], current: 'origins-study.html' },
  { page: 'research-log.html', classes: ['ui-page-research-log'], current: 'research-log.html' },
  { page: 'research-graduation.html', classes: ['ui-page-research-graduation', 'ui-page-research-log'], current: 'research-log.html', link: 'main a[href="research-graduation.html"]' },
  { page: 'paper-shelf.html', classes: ['ui-page-paper-shelf'], current: 'paper-shelf.html' },
  { page: 'cv.html', classes: ['ui-page-cv'], current: 'cv.html' },
  { page: 'photography.html', classes: ['ui-page-photography'], current: 'photography.html' },
  { page: 'contact.html', classes: ['ui-page-contact'], current: 'contact.html' }
];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await context.addInitScript(() => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); } catch {} });
const pageState = page => page.evaluate(() => ({
  classes: [...document.body.classList].filter(name => name.startsWith('ui-page-')).sort(),
  current: [...document.querySelectorAll('.site-header .nav a, .site-header .nav-log-gate')].map(link => [link.getAttribute('href'), link.getAttribute('aria-current')]),
  // Mission Index layout rules are keyed to body.ui-page-research-graduation (style.css).
  missionIndex: (() => {
    const index = document.getElementById('mission-index');
    const panel = document.querySelector('.mission-index-panel');
    return index && panel ? [getComputedStyle(index).display, getComputedStyle(panel).marginTop] : null;
  })()
}));
try {
  const direct = {};
  for (const { page: name, classes, current } of route) {
    const page = await context.newPage();
    await page.goto(`${base}/${name}`, { waitUntil: 'load' });
    direct[name] = await pageState(page);
    assert.deepEqual(direct[name].classes, classes, `${name}: direct load must expose exactly the server-rendered page classes`);
    assert.deepEqual(direct[name].current.filter(([, value]) => value), [[current, 'page']], `${name}: one header link marks the current page`);
    await page.close();
  }
  assert.ok(direct['research-graduation.html'].missionIndex, 'research-graduation.html: Mission Index markup is present');

  const page = await context.newPage();
  await page.goto(`${base}/contact.html`, { waitUntil: 'load' });
  await page.evaluate(() => { window.__softNavProbe = true; });
  for (const { page: name, link } of route) {
    await page.locator(link || `.site-header .nav a[href="${name}"], .site-header .nav-log-gate[href="${name}"]`).first().click();
    await page.waitForFunction(target => location.pathname.endsWith('/' + target) && !document.documentElement.classList.contains('mads-soft-nav-active') && document.querySelector('main')?.getAttribute('aria-busy') !== 'true', name);
    assert.equal(await page.evaluate(() => window.__softNavProbe), true, `${name}: reached without soft navigation`);
    assert.deepEqual(await pageState(page), direct[name], `${name}: soft navigation must match a direct load`);
  }
  await page.close();
  console.log(`Soft navigation page classes and header state match direct loads on ${route.length} pages.`);
} finally {
  await browser.close();
}
