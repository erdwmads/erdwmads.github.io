import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  for (const route of ['research', 'cv', 'research', 'cv']) {
    await page.locator(`.nav a[href="${route}.html"]`).click();
    await page.waitForURL(`**/${route}.html`);
    await page.waitForTimeout(250);
  }
  const publications = await page.evaluate(() => {
    let count = 0;
    const listener = () => count++;
    window.addEventListener('mads:power-state', listener);
    document.dispatchEvent(new Event('visibilitychange'));
    window.removeEventListener('mads:power-state', listener);
    return count;
  });
  assert.equal(publications, 1, 'soft navigation duplicated power-manager listeners');
  let rejectRequest;
  const release = new Promise(resolve => { rejectRequest = resolve; });
  let intercepted;
  const interceptReady = new Promise(resolve => { intercepted = resolve; });
  await page.route('**/research.html', async route => {
    if (route.request().isNavigationRequest()) return route.continue();
    intercepted();
    await release;
    await route.abort('failed');
  });
  await page.locator('.nav a[href="research.html"]').click();
  await interceptReady;
  await page.locator('.nav a[href="contact.html"]').click();
  await page.waitForURL('**/contact.html');
  rejectRequest();
  await page.waitForTimeout(600);
  assert.ok(page.url().endsWith('/contact.html'), 'superseded failed request replaced the current route');
  await page.unroute('**/research.html');
  if (process.env.MISSION_TEST_PASSWORD) {
    await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
    await page.locator('[data-research-lock-input]').fill(process.env.MISSION_TEST_PASSWORD);
    await page.locator('[data-research-lock-form]').evaluate(form => form.requestSubmit());
    await page.locator('[data-mission-target="log-009"]').click();
    await page.locator('[data-mission-target="log-010"]').click();
    await page.goBack();
    await page.waitForTimeout(500);
    assert.ok(await page.locator('html').evaluate(el => el.classList.contains('research-unlocked')), 'same-document Back relocked the archive');
    assert.equal(await page.locator('.mission-log-entry').getAttribute('id'), 'log-009');
    await page.goForward();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.mission-log-entry').getAttribute('id'), 'log-010');
    await page.locator('.nav a[href="contact.html"]').click();
    await page.waitForURL('**/contact.html');
    assert.equal(await page.evaluate(() => Boolean(window.MadsProtectedArchive)), false, 'leaving the archive failed to relock');
  }
  // Lifecycle contract: soft navigation runs only the fetched page's data-page-script scripts again. Shell scripts, the
  // inline header controller and the entrance opener run once per document; the 3D features load only where they appear.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); } catch {} });
    const lifecycle = await context.newPage();
    const errors = [], chunks = [];
    lifecycle.on('pageerror', error => errors.push(String(error)));
    lifecycle.on('request', request => { const { pathname } = new URL(request.url()); if (pathname.startsWith('/_astro/')) chunks.push(pathname); });
    await lifecycle.goto(`${base}/contact.html`, { waitUntil: 'networkidle' });
    assert.equal(chunks.some(chunk => /planetary-explorer|loader|image-inspector/.test(chunk)), false, 'Contact must not load the 3D features');
    chunks.length = 0;
    await lifecycle.evaluate(() => {
      window.__headerController = window.__madsSiteHeaderAbort;
      window.__ranScripts = [];
      new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.nodeName === 'SCRIPT') window.__ranScripts.push(node.getAttribute('src')?.split('?')[0] || 'inline'); }).observe(document.body, { childList: true });
    });
    for (const route of ['cv', 'contact', 'ryugu-bennu']) {
      await lifecycle.locator(`.site-header a[href="${route}.html"]`).first().click();
      await lifecycle.waitForURL(`**/${route}.html`);
      await lifecycle.waitForFunction(() => !document.documentElement.classList.contains('mads-soft-nav-active'));
    }
    await lifecycle.waitForFunction(() => document.querySelector('[data-planetary-explorer]')?.dataset.initialized === 'true' && document.querySelector('[data-sample-missions]')?.dataset.initialized === 'true');
    const state = await lifecycle.evaluate(() => ({ ran: window.__ranScripts, header: window.__madsSiteHeaderAbort === window.__headerController, arrival: document.querySelector('#cosmic-arrival')?.open ?? false }));
    for (const feature of [/\/planetary-explorer\.[\w-]+\.js$/, /\/image-inspector\.[\w-]+\.js$/]) assert.ok(chunks.some(chunk => feature.test(chunk)), `${feature} loads when its page first appears`);
    assert.deepEqual(state.ran, ['assets/js/cv.js', 'assets/js/contact.js'], 'only data-page-script scripts run again');
    assert.equal(state.header, true, 'soft navigation re-ran the header controller');
    assert.equal(state.arrival, false, 'soft navigation reopened the entrance dialog');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // research.html forwards section links from before the September 2026 move; its forwarder is a data-page-script,
  // so an in-site link that opens research.html in place still ends on ryugu-bennu.html.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); } catch {} });
    const forward = await context.newPage();
    const errors = [], researchRequests = [];
    forward.on('pageerror', error => errors.push(String(error)));
    forward.on('request', request => { if (new URL(request.url()).pathname.endsWith('/research.html')) researchRequests.push(request.isNavigationRequest() ? 'navigation' : 'fetch'); });
    await forward.goto(`${base}/contact.html`, { waitUntil: 'networkidle' });
    await forward.evaluate(() => {
      const link = Object.assign(document.createElement('a'), { href: 'research.html#missions-title', id: 'legacy-missions-link', textContent: 'Missions (old link)' });
      document.querySelector('main').append(link);
    });
    await forward.locator('#legacy-missions-link').click();
    await forward.waitForURL(url => url.pathname.endsWith('/ryugu-bennu.html') && url.hash === '#missions-title');
    assert.deepEqual(researchRequests, ['fetch'], 'research.html must open in place (soft navigation) before it forwards');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Deploy skew: a fetched page whose head names a shell module or stylesheet this document did not load comes from a
  // newer deploy, so it opens with a full load (or a reload after Back) instead of a <main> swap into the stale shell.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); } catch {} });
    const skew = await context.newPage();
    const errors = [];
    skew.on('pageerror', error => errors.push(String(error)));
    const sameDocument = () => skew.evaluate(() => window.__sameDocument === true);
    const markDocument = () => skew.evaluate(() => { window.__sameDocument = true; });
    const serveFromNextDeploy = async (route, change) => {
      const state = { changed: false };
      await skew.route(`**/${route}.html`, async request => {
        if (request.request().isNavigationRequest()) return request.continue();
        const response = await request.fetch();
        const html = await response.text();
        const body = change(html);
        state.changed ||= body !== html;
        await request.fulfill({ response, body });
      });
      return state;
    };
    await skew.goto(`${base}/contact.html`, { waitUntil: 'networkidle' });
    await markDocument();
    await skew.locator('.site-header a[href="cv.html"]').first().click();
    await skew.waitForURL('**/cv.html');
    await skew.waitForFunction(() => !document.documentElement.classList.contains('mads-soft-nav-active'));
    assert.equal(await sameDocument(), true, 'a page from the same deploy opens in place');

    const stylesheet = await serveFromNextDeploy('contact', html => html.replace(/(<link rel="stylesheet" href="assets\/css\/site\.css\?v=)[0-9a-f]+/, '$1fromnextdeploy'));
    const reloaded = skew.waitForEvent('load');
    await skew.goBack().catch(() => {});
    await reloaded;
    assert.equal(stylesheet.changed, true, 'contact.html: site.css link not found');
    assert.ok(skew.url().endsWith('/contact.html'));
    assert.equal(await sameDocument(), false, 'Back to a page from a newer deploy (changed stylesheet) must reload it');
    await skew.unroute('**/contact.html');

    await markDocument();
    const shellModule = await serveFromNextDeploy('research', html => html.replace(/(<script type="module" src="\/_astro\/LegacyShell[^"]*?)\.js"/, '$1.next.js"'));
    await skew.locator('.site-header a[href="research.html"]').first().click();
    await skew.waitForURL('**/research.html');
    await skew.waitForLoadState('load');
    assert.equal(shellModule.changed, true, 'research.html: shell module script not found');
    assert.equal(await sameDocument(), false, 'a page from a newer deploy (changed shell module) must open with a full load');
    await skew.unroute('**/research.html');
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Navigation lifecycle: singleton power listeners, superseded failure, page-script contract, lazy 3D features, research.html forwarding after soft navigation, deploy-skew full loads and optional archive history checks passed.');
} finally { await browser.close(); }
