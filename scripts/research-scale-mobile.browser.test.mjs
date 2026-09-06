import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  for (const width of [320, 390, 430, 760]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
    const section = page.locator('[data-research-scale]');
    for (const theme of ['space', 'light']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const material of ['orgueil', 'bennu', 'ryugu']) {
        await page.locator(`#research-material-tab-${material}`).tap();
        for (const stage of material === 'bennu' ? ['asteroid', 'sample', 'microstructure'] : [null]) {
          if (stage) await page.locator(`#research-scale-tab-${stage}`).tap();
          const active = section.locator('.research-scale__material:not([hidden])');
          await active.locator('img:visible').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => [...document.querySelectorAll('.research-scale__material:not([hidden]) img')].filter(img => img.checkVisibility()).every(img => img.complete && img.naturalWidth > 0));
          await active.locator('img:visible').evaluate(img => img.decode());
          const layout = await active.evaluate(el => {
            const figure = [...el.querySelectorAll('figure')].find(node => node.checkVisibility());
            const boundary = el.querySelector('.research-scale__boundary');
            const section = el.closest('[data-research-scale]');
            const hidden = [...section.querySelectorAll('[role="tabpanel"][hidden]')];
            const image = figure.querySelector('img');
            return {
              hiddenHaveNoLayout: hidden.every(node => node.getClientRects().length === 0),
              gap: boundary.getBoundingClientRect().top - figure.getBoundingClientRect().bottom,
              trailingGap: el.getBoundingClientRect().bottom - boundary.getBoundingClientRect().bottom,
              overflow: document.documentElement.scrollWidth > innerWidth,
              imageAboveCaption: figure.querySelector('.research-scale__media').getBoundingClientRect().bottom <= figure.querySelector('figcaption').getBoundingClientRect().top,
              completeImage: getComputedStyle(image).objectFit === 'contain'
            };
          });
          const label = `${width}/${theme}/${material}/${stage}`;
          assert.equal(layout.hiddenHaveNoLayout, true, `${label}: hidden panels still reserve mobile space`);
          assert.ok(layout.gap >= 0 && layout.gap <= 24, `${label}: unexplained gap ${layout.gap}`);
          assert.ok(layout.trailingGap <= 1, `${label}: empty trailing space ${layout.trailingGap}`);
          assert.equal(layout.overflow, false, label);
          assert.equal(layout.imageAboveCaption && layout.completeImage, true, label);
        }
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Mobile Research: touch switching, inactive panel removal, compact flow, complete images and both themes passed.');
} finally {
  await browser.close();
}
