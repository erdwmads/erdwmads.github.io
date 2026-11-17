// Home Current Focus (spec §4.1): an article abstract beside its article-information list. In both themes at 1440 and
// 390 px, at rest and hovered, the list is ruled rows with no glass, image or box behind them; labels are 12 px and
// values are set in the sans at 400; text stays inside its row; the methods carry their status markers; the question
// row is gone, because the title page states the question. At 1440 x 900 the section's kicker and heading are whole in
// the first view, with a line to spare, once the header has its specified 72 px (spec §4.0): the check measures from
// the top of main plus 72 px, so it does not depend on how far the header styles have come (or on the Replay button).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as project from '../src/data/project.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  for (const theme of ['space', 'light']) {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(theme => { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', theme); }, theme);
      const page = await context.newPage();
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const label = `${theme}/${width}`;
      if (width === 1440) {
        const fold = await page.evaluate(() => {
          const main = document.querySelector('main').getBoundingClientRect().top;
          const at = selector => document.querySelector(selector).getBoundingClientRect();
          return { kicker: at('.current-focus-section > .kicker').top - main + 72, heading: at('#current-focus-title').bottom - main + 72 };
        });
        assert.ok(fold.kicker < fold.heading && fold.heading <= height - 24, `${label}: the Current Focus heading ends at ${Math.round(fold.heading)} px with a 72 px header; it must end by ${height - 24} px`);
      }
      const labels = await page.locator('.focus-list dt').allTextContents();
      assert.deepEqual(labels, ['Target material', 'Methods', 'Broader context', 'Status as of'], `${label}: rows`);
      assert.equal(await page.locator('.current-focus-section').getByText('Current question').count(), 0, `${label}: the question row is retired`);
      const methods = await page.locator('.focus-methods li').evaluateAll(items => items.map(item => ({ text: item.textContent.trim(), marker: item.querySelector('.marker[data-marker="status"]')?.dataset.value })));
      assert.equal(methods.map(item => item.text).join(' · '), project.methodsSummary, `${label}: methods in the words of methodsSummary`);
      assert.deepEqual(methods.map(item => item.marker), ['in-progress', 'next', 'planned'], `${label}: each method group leads with its status marker`);
      await page.locator('.focus-list').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      for (const hover of [false, true]) {
        if (hover) await page.locator('.focus-list > div').first().hover();
        const rows = await page.locator('.focus-list > div').evaluateAll(elements => elements.map(el => {
          const css = getComputedStyle(el);
          const row = el.getBoundingClientRect();
          const dt = getComputedStyle(el.querySelector('dt'));
          const dd = el.querySelector('dd');
          const value = getComputedStyle(dd);
          const text = dd.getBoundingClientRect();
          return {
            backdrop: css.backdropFilter, background: css.backgroundImage, fill: css.backgroundColor, rule: parseFloat(css.borderBottomWidth),
            labelSize: parseFloat(dt.fontSize), valueFamily: value.fontFamily, valueWeight: value.fontWeight, valueSize: parseFloat(value.fontSize),
            fits: text.left >= row.left - 1 && text.right <= row.right + 1, images: el.querySelectorAll('img, picture, svg').length
          };
        }));
        assert.equal(rows.length, 4);
        for (const row of rows) {
          assert.equal(row.backdrop, 'none', `${label}/hover=${hover}: glass blur`);
          assert.equal(row.background, 'none', `${label}: background image`);
          assert.equal(row.fill, 'rgba(0, 0, 0, 0)', `${label}: a filled box instead of a ruled row`);
          assert.equal(row.rule, 1, `${label}: rows are ruled by a 1 px hairline`);
          assert.equal(row.images, 0, `${label}: an image in the information list`);
          assert.equal(row.labelSize, 12, `${label}: labels are 12 px`);
          assert.match(row.valueFamily, /^"?Source Sans 3/, `${label}: values in the sans`);
          assert.equal(row.valueWeight, '400', `${label}: values are not bold`);
          assert.ok(row.valueSize >= 15 && row.valueSize <= 16, `${label}: values at ${row.valueSize} px`);
          assert.ok(row.fits, `${label}: text overflows its row`);
        }
      }
      await context.close();
    }
  }
  console.log('Home Current Focus: kicker and heading in the first view at 1440 x 900, ruled article information (12 px labels, sans 400 values, status markers), no glass or boxes; both themes, desktop and phone, at rest and hovered.');
} finally { await browser.close(); }
