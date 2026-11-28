// Home Current Focus (spec §4.1; version 1's fact list, owner 2026-11-25): an article abstract beside its
// article-information list. In both themes at 1440 and 390 px, at rest and hovered, the list is rows ruled by version
// 1's 1 px line above each, with no glass, image or box behind them; labels are 12 px and values are set in Montserrat
// at 600 and 14 px, as version 1's were; text stays inside its row; the methods carry their status markers; version 1's
// "Current question" row opens the list again ((g) revert, 2026-11-26: the line under the name shows the department and
// affiliation, so the question lives here, in its canonical words). Since the Home opening (owner, 2026-11-28) the
// first view at 1440 x 900 is the comet plate and the name; Current Focus is the path's second stop, its kicker the
// museum caption 02, and it starts below the opening, kicker before heading.
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
          const at = selector => document.querySelector(selector).getBoundingClientRect();
          return { opening: at('.home-opening').bottom, kicker: at('.current-focus-section > .kicker').top, heading: at('#current-focus-title').bottom, number: document.querySelector('.current-focus-section > .kicker > .folio-section__number')?.textContent.trim() };
        });
        assert.ok(fold.opening >= height - 1 && fold.kicker >= fold.opening && fold.kicker < fold.heading, `${label}: Current Focus starts below the opening (opening ends at ${Math.round(fold.opening)} px, kicker at ${Math.round(fold.kicker)} px)`);
        assert.equal(fold.number, '02', `${label}: Current Focus is caption 02`);
      }
      const labels = await page.locator('.focus-list dt').allTextContents();
      assert.deepEqual(labels, ['Current question', 'Target material', 'Methods', 'Broader context', 'Status as of'], `${label}: rows`);
      assert.equal((await page.locator('.focus-list > div').first().locator('dd').textContent()).trim(), project.question, `${label}: the question row carries the canonical question`);
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
            backdrop: css.backdropFilter, background: css.backgroundImage, fill: css.backgroundColor, rule: parseFloat(css.borderTopWidth),
            labelSize: parseFloat(dt.fontSize), valueFamily: value.fontFamily, valueWeight: value.fontWeight, valueSize: parseFloat(value.fontSize),
            fits: text.left >= row.left - 1 && text.right <= row.right + 1, images: el.querySelectorAll('img, picture, svg').length
          };
        }));
        assert.equal(rows.length, 5);
        for (const row of rows) {
          assert.equal(row.backdrop, 'none', `${label}/hover=${hover}: glass blur`);
          assert.equal(row.background, 'none', `${label}: background image`);
          assert.equal(row.fill, 'rgba(0, 0, 0, 0)', `${label}: a filled box instead of a ruled row`);
          assert.equal(row.rule, 1, `${label}: rows are ruled by a 1 px line`);
          assert.equal(row.images, 0, `${label}: an image in the information list`);
          assert.equal(row.labelSize, 12, `${label}: labels are 12 px`);
          assert.match(row.valueFamily, /^"?Montserrat/, `${label}: values in Montserrat`);
          // Since 2026-11-28 the values sit at 500, under the section heading's 400 and above the muted text (the quiet
          // hierarchy of the lab site's language); version 1 set them at 600.
          assert.equal(row.valueWeight, '500', `${label}: values at 500`);
          assert.equal(row.valueSize, 14, `${label}: values at ${row.valueSize} px, not version 1's 14 px`);
          assert.ok(row.fits, `${label}: text overflows its row`);
        }
      }
      await context.close();
    }
  }
  console.log('Home Current Focus: caption 02 below the opening at 1440 x 900, ruled article information (12 px labels, Montserrat 600 values at 14 px, status markers), no glass or boxes; both themes, desktop and phone, at rest and hovered.');
} finally { await browser.close(); }
