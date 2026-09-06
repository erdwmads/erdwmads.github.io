import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const componentFile = new URL('src/components/ResearchScaleJourney.astro', root);
assert.ok(existsSync(componentFile), 'Research Scale Journey component exists');
const component = readFileSync(componentFile, 'utf8');
const script = readFileSync(new URL('public/assets/js/research-scale.js', root), 'utf8');
const css = readFileSync(new URL('public/assets/css/research-scale.css', root), 'utf8');
assert.doesNotMatch(component + script + css, /grad-log|mission-log|missionLog|Orgueil Grad Data|research-graduation|archive\//i);
assert.doesNotMatch(css, /letter-spacing\s*:\s*-/);
assert.doesNotMatch(script, /setInterval|requestAnimationFrame/);

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {})
});
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
// Isolated mode renders the component's static HTML inside the real site shell.
// Default mode requires actual integration and never silently inserts missing wiring.
const isolated = process.env.RESEARCH_SCALE_ISOLATED === '1';
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  const protectedRequests = [];
  page.on('request', request => {
    if (/\/assets\/img\/(?:grad-log|mission-log)\//i.test(request.url())) protectedRequests.push(request.url());
  });
  async function openJourney() {
    await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
    if (isolated) {
      assert.doesNotMatch(component, /^---/m, 'isolated fixture must be literal Astro HTML');
      await page.locator('main').evaluate((main, html) => { main.innerHTML = html; }, component);
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: script });
    }
    await page.locator('[data-research-scale][data-scale-ready]').waitFor();
    await page.locator('[data-research-scale]').scrollIntoViewIfNeeded();
  }
  await openJourney();
  const section = page.locator('[data-research-scale]');
  const materials = section.locator('[data-material-tabs]').getByRole('tab');
  assert.equal(await materials.count(), 3, 'independent CI / Orgueil, Bennu and Ryugu entrances');
  assert.equal(await materials.first().getAttribute('aria-selected'), 'true', 'Orgueil is the default research target');
  const orgueil = section.locator('#research-material-orgueil');
  assert.match(await orgueil.innerText(), /CI1|dolomite/);
  await orgueil.locator('img').evaluate(image => image.decode());
  assert.match(await orgueil.locator('img').getAttribute('src'), /orgueil/);
  await materials.first().focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await materials.nth(1).getAttribute('aria-selected'), 'true');
  const tabs = section.locator('[data-scale-tabs]').getByRole('tab');
  const panel = section.locator('.research-scale__panel').filter({ visible: true });
  assert.equal(await tabs.count(), 3);
  assert.match(await section.innerText(), /Bennu is not identified as Orgueil's parent body/);
  assert.match(await section.innerText(), /not my Orgueil results/);
  const images = await section.locator('img').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')));
  assert.equal(new Set(images).size, 5);
  for (const src of images) {
    assert.match(src, /^\/assets\/img\/research-scale\/[a-z-]+\.(?:jpg|png)$/);
    assert.ok(existsSync(new URL(`public${src}`, root)), `public image exists: ${src}`);
  }

  for (const theme of ['space', 'light']) {
    for (const width of [320, 390, 760, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.toggleAttribute('data-theme-space', theme === 'space');
        document.documentElement.classList.toggle('theme-preloaded-space', theme === 'space');
      }, theme);
      let firstGeometry;
      for (let index = 0; index < 3; index++) {
        await tabs.nth(index).click();
        assert.equal(await tabs.nth(index).getAttribute('aria-selected'), 'true');
        assert.equal(await section.locator('[role="tab"][tabindex="0"]').count(), 2);
        assert.equal(await panel.count(), 1);
        assert.equal(await panel.getAttribute('aria-labelledby'), await tabs.nth(index).getAttribute('id'));
        await panel.locator('img').evaluate(image => image.decode());
        const geometry = await panel.evaluate(el => {
          const image = el.querySelector('img');
          const media = el.querySelector('.research-scale__media');
          const caption = el.querySelector('figcaption');
          const a = media.getBoundingClientRect();
          const b = caption.getBoundingClientRect();
          const section = el.closest('[data-research-scale]');
          const bounds = section.getBoundingClientRect();
          return {
            width: a.width, height: a.height, sectionHeight: bounds.height,
            fits: bounds.left >= -1 && bounds.right <= innerWidth + 1 && section.scrollWidth <= section.clientWidth + 1,
            separated: a.right <= b.left + 1 || a.bottom <= b.top + 1,
            loaded: image.complete && image.naturalWidth > 0,
            fit: getComputedStyle(image).objectFit,
            dimensionsMatch: image.naturalWidth === Number(image.getAttribute('width')) && image.naturalHeight === Number(image.getAttribute('height')),
            imageAnimation: getComputedStyle(image).animationName,
            spacing: getComputedStyle(el.querySelector('h3')).letterSpacing,
            overflowingText: [...section.querySelectorAll('button, p, h2, h3, a')].some(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1)
          };
        });
        assert.ok(geometry.fits && geometry.separated && geometry.loaded, `${theme}/${width}/${index}: ${JSON.stringify(geometry)}`);
        assert.equal(geometry.fit, 'contain');
        assert.equal(geometry.dimensionsMatch, true, 'declared dimensions match downloaded source');
        assert.equal(geometry.imageAnimation, 'none');
        assert.ok(['0px', 'normal'].includes(geometry.spacing), 'zero tracking (Edge serializes zero as normal)');
        assert.equal(geometry.overflowingText, false);
        if (firstGeometry) {
          for (const key of ['width', 'height', 'sectionHeight']) {
            assert.ok(Math.abs(geometry[key] - firstGeometry[key]) < 1, `${key} shifted at ${theme}/${width}`);
          }
        } else firstGeometry = geometry;
      }
      if (process.env.RESEARCH_SCALE_SCREENSHOTS && [390, 1440].includes(width)) {
        await section.screenshot({ path: join(process.env.RESEARCH_SCALE_SCREENSHOTS, `research-scale-${theme}-${width}.png`) });
      }
      const bennuHeight = await section.evaluate(el => el.getBoundingClientRect().height);
      await materials.first().click();
      await orgueil.locator('img').evaluate(image => image.decode());
      const target = await orgueil.evaluate(el => {
        const section = el.closest('[data-research-scale]');
        const image = el.querySelector('img');
        const a = el.querySelector('.research-scale__media').getBoundingClientRect();
        const b = el.querySelector('figcaption').getBoundingClientRect();
        return {
          height: section.getBoundingClientRect().height,
          fits: section.scrollWidth <= section.clientWidth + 1,
          separate: a.right <= b.left + 1 || a.bottom <= b.top + 1,
          dimensionsMatch: image.naturalWidth === Number(image.getAttribute('width')) && image.naturalHeight === Number(image.getAttribute('height')),
          naturalWidth: image.naturalWidth,
          fit: getComputedStyle(image).objectFit
        };
      });
      assert.ok(target.fits && target.separate && target.naturalWidth > 0, `Orgueil ${theme}/${width}: ${JSON.stringify(target)}`);
      assert.equal(target.fit, 'contain');
      assert.equal(target.dimensionsMatch, true, 'Orgueil image dimensions match the original');
      assert.ok(Math.abs(target.height - bennuHeight) < 1, 'switching materials does not move following content');
      await materials.nth(2).click();
      const ryugu = section.locator('#research-material-ryugu');
      assert.equal(await ryugu.isVisible(), true);
      assert.match(await ryugu.innerText(), /Hayabusa2/);
      assert.match(await ryugu.innerText(), /CI chondrites/);
      await ryugu.locator('img').evaluate(image => image.decode());
      const ryuguGeometry = await ryugu.evaluate(el => {
        const img = el.querySelector('img');
        const a = el.querySelector('.research-scale__media').getBoundingClientRect();
        const b = el.querySelector('figcaption').getBoundingClientRect();
        const section = el.closest('[data-research-scale]');
        return { fits: section.scrollWidth <= section.clientWidth + 1, separate: a.right <= b.left + 1 || a.bottom <= b.top + 1, height: section.getBoundingClientRect().height, loaded: img.naturalWidth > 0 && img.naturalWidth === Number(img.getAttribute('width')) && img.naturalHeight === Number(img.getAttribute('height')), fit: getComputedStyle(img).objectFit };
      });
      assert.ok(ryuguGeometry.fits && ryuguGeometry.separate && ryuguGeometry.loaded, `Ryugu ${theme}/${width}: ${JSON.stringify(ryuguGeometry)}`);
      assert.equal(ryuguGeometry.fit, 'contain');
      assert.ok(Math.abs(ryuguGeometry.height - bennuHeight) < 1);
      await page.keyboard.press('Home');
      assert.equal(await materials.first().getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await materials.nth(2).getAttribute('aria-selected'), 'true');
      await materials.nth(1).click();
    }
  }

  await tabs.first().focus();
  for (const [key, expected] of [['ArrowLeft', 2], ['Home', 0], ['ArrowRight', 1], ['End', 2], ['ArrowRight', 0]]) {
    await page.keyboard.press(key);
    assert.equal(await tabs.nth(expected).getAttribute('aria-selected'), 'true');
    assert.ok(await tabs.nth(expected).evaluate(el => el === document.activeElement));
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    document.documentElement.classList.remove('ambient-fx-disabled');
    document.querySelector('.ambient-fx-toggle')?.setAttribute('aria-pressed', 'true');
    window.dispatchEvent(new CustomEvent('mads:fx-state', { detail: { enabled: true } }));
  });
  const duration = () => tabs.first().evaluate(el => getComputedStyle(el).transitionDuration);
  const beamDuration = () => section.locator('[data-material-tabs] .research-scale__beam').evaluate(el => getComputedStyle(el).transitionDuration);
  assert.notEqual(await duration(), '0s', 'FX ON permits a finite control transition');
  assert.notEqual(await beamDuration(), '0s', 'FX ON enables the material selection beam');
  await materials.first().click();
  await materials.nth(1).click();
  await page.waitForTimeout(280);
  const beamGeometry = await section.locator('[data-material-tabs]').evaluate(el => {
    const tab = el.querySelector('[aria-selected="true"]').getBoundingClientRect();
    const beam = el.querySelector('.research-scale__beam').getBoundingClientRect();
    return { aligned: beam.left >= tab.left && beam.right <= tab.right && beam.top > tab.top + tab.height / 2 && beam.bottom < tab.bottom };
  });
  assert.equal(beamGeometry.aligned, true, 'selection beam remains underneath the selected material');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await duration(), '0s', 'reduced motion disables transitions');
  assert.equal(await beamDuration(), '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('mads:fx-state', { detail: { enabled: false } })));
  assert.equal(await duration(), '0s', 'FX OFF disables transitions');
  assert.equal(await beamDuration(), '0s');
  await tabs.first().click();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'tabpanel', 'Tab enters selected panel');
  assert.equal(await section.locator('.research-scale__panel[inert]').count(), 2, 'inactive scales are inert');
  assert.equal(await materials.nth(1).getAttribute('aria-selected'), 'true', 'scale selection does not deselect its material');
  await materials.first().click();
  assert.equal(await orgueil.isVisible(), true);
  assert.equal(await section.locator('#research-material-bennu').getAttribute('inert'), '');
  await materials.nth(1).click();

  // Re-execution and soft-nav reinitialization must not multiply delegated handlers.
  await page.addScriptTag({ content: script });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('mads:soft-nav-start'));
      window.dispatchEvent(new Event('mads:soft-nav-ready'));
    });
  }
  await tabs.first().click();
  await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');

  if (!isolated) {
    await page.evaluate(() => { window.__scaleNavigationProbe = true; });
    await page.locator('.nav a[href="cv.html"]').click();
    await page.waitForURL('**/cv.html');
    assert.equal(await section.count(), 0);
    await page.locator('.nav a[href="research.html"]').click();
    await page.waitForURL('**/research.html');
    await page.locator('[data-scale-ready]').waitFor();
    assert.equal(await page.evaluate(() => window.__scaleNavigationProbe), true, 'navigation remained soft');
    assert.equal(await materials.first().getAttribute('aria-selected'), 'true');
    await materials.nth(1).click();
    await tabs.first().click();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
    const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noScriptPage = await noScriptContext.newPage();
    await noScriptPage.goto(`${base}/research.html`);
    const fallback = noScriptPage.locator('[data-research-scale]');
    assert.equal(await fallback.locator('[data-scale-tabs]').isVisible(), false, 'no nonfunctional tabs without JS');
    assert.equal(await fallback.locator('[data-material-tabs]').isVisible(), false);
    assert.equal(await fallback.getByRole('tabpanel').count(), 6, 'three materials and three Bennu stages readable without JS');
    await noScriptContext.close();
  }
  assert.deepEqual(protectedRequests, [], 'no protected image requests');
  assert.deepEqual(errors, [], 'no browser errors');
  console.log(`Research Scale Journey passed (${isolated ? 'isolated real-shell fixture' : 'integrated'}): five images, three independent materials, scale tabs, fixed geometry, themes, mobile, FX, lifecycle and public-data boundary.`);
} finally {
  await browser.close();
}
