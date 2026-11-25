// Header bands and control clearance (spec §4.0, §6.3): one row of at most 76 px from 1200 px, two rows of at most
// 104 px at 761-1199 px, a bar of at most 56 px at 760 px and below; the brand's tagline and the gate's "Active Archive"
// show in the header exactly from 1360 px (the phone sheet carries both as text instead); 7 links with the divider
// before CV, on one row above 760 px; every link and action takes its own clicks; the brand is named by its visible
// text plus ", home"; footer links stay clear of the fixed settings control, and phones have no dock. The Paper Shelf
// targets at the end (WP5's page) are checked at every width, the old 768, 1100 and 1280 px included.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:52523';
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });

async function clearTargets(locator) {
  return locator.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { label: element.getAttribute('aria-label') || element.textContent.trim(), clear: Boolean(hit && (hit === element || element.contains(hit))), width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom };
  }));
}

// Runs in the page: the header's bands and what each one shows. seen() is the text a sighted reader sees (no
// visually hidden or display:none parts).
function readBands() {
  const shown = element => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const seen = node => [...node.childNodes].map(child => child.nodeType === 3 ? child.textContent : child.nodeType === 1 && child.getClientRects().length && child.getBoundingClientRect().width > 1 ? seen(child) : '').join(' ');
  return {
    header: document.querySelector('.site-header').getBoundingClientRect().height,
    bar: document.querySelector('.header-inner').getBoundingClientRect().height,
    tagline: shown(document.querySelector('.brand > strong + span')),
    sheetTagline: shown(document.querySelector('.header-actions__tagline')),
    subLabel: shown(document.querySelector('.nav-log-gate__copy small')),
    brandText: seen(document.querySelector('.brand')).replace(/\s+/g, ' ').trim()
  };
}

try {
  for (const width of [390, 760, 761, 768, 1024, 1100, 1199, 1200, 1280, 1359, 1360, 1440]) {
    const phone = width <= 760;
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await page.addInitScript(() => sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'));
    for (const theme of ['space', 'light']) {
      const where = `${width} ${theme}`;
      await page.goto(`${base}/research-log.html`, { waitUntil: 'networkidle' });
      await page.evaluate(theme => { if (document.documentElement.dataset.theme !== theme) document.querySelector('.theme-toggle').click(); }, theme);
      await page.evaluate(() => document.fonts.ready);
      const bands = await page.evaluate(readBands);
      if (phone) assert(bands.bar <= 56, `${where}: phone bar ${bands.bar}px tall`);
      else if (width < 1200) assert(bands.header <= 104, `${where}: two-row header ${bands.header}px tall`);
      else assert(bands.header <= 76, `${where}: header row ${bands.header}px tall`);
      if (!phone) {
        assert.equal(bands.tagline, width >= 1360, `${where}: the brand tagline shows exactly from 1360 px`);
        assert.equal(bands.subLabel, width >= 1360, `${where}: "Active Archive" shows exactly from 1360 px`);
      }
      assert.equal(bands.sheetTagline, false, `${where}: the sheet's tagline is hidden while the sheet is closed or absent`);
      // The accessible name keeps all of the visible text (label in name) and then names the destination.
      assert.equal(await page.locator('.brand').getAttribute('aria-label'), null, 'the brand has no aria-label');
      const brandName = page.getByRole('link', { name: new RegExp(`^${bands.brandText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,\\s*home$`) });
      assert.equal(await brandName.count(), 1, `${where}: the brand is named "${bands.brandText}, home"`);
      assert.equal(await brandName.evaluate(link => link.classList.contains('brand')), true, 'the named link is the brand');
      if (phone) {
        await page.locator('[data-nav-toggle]').click();
        const sheet = await page.evaluate(readBands);
        assert.deepEqual([sheet.sheetTagline, sheet.tagline, sheet.subLabel], [true, false, true], `${where}: the open sheet carries the tagline and the gate's status, the bar does not`);
      }
      const links = await clearTargets(page.locator('.nav a'));
      // No Home entry (the brand links home): the research group, a divider, then the personal group.
      assert.equal(links.length, 7, 'Research, Ryugu & Bennu, Origins, Paper Shelf | CV, Photography, Contact');
      assert.equal(await page.locator('.nav .nav__divider + a').getAttribute('href'), 'cv.html', 'the divider opens the personal group');
      assert(links.every(link => link.clear), `${where}: obscured navigation ${JSON.stringify(links)}`);
      if (!phone) assert(Math.max(...links.map(link => link.top)) - Math.min(...links.map(link => link.top)) < 1, `${where}: navigation labels unexpectedly wrap`);
      const actions = await clearTargets(page.locator('.nav-log-gate, .theme-toggle'));
      assert(actions.every(action => action.clear), `${where}: obscured header action ${JSON.stringify(actions)}`);
      if (phone) await page.locator('[data-nav-toggle]').click();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const footer = await clearTargets(page.locator(phone ? '.site-footer a' : '.site-footer a, .obs-fx-settings'));
      assert(footer.every(action => action.clear), `${where}: footer action obscured ${JSON.stringify(footer)}`);
      // Phones have no fixed settings control: the effects panel lies in the menu sheet (R3, E136).
      if (phone) assert.equal(await page.locator('.obs-fx-dock').isVisible(), false, `${where}: no fixed dock on phones`);
      else {
        // Every footer link (the ORCID iD and Back to top) stays clear of the fixed settings control.
        const overlap = await page.evaluate(() => {
          const b = document.querySelector('.obs-fx-settings').getBoundingClientRect();
          return [...document.querySelectorAll('.site-footer a')].some((link) => {
            const a = link.getBoundingClientRect();
            return Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
          });
        });
        assert.equal(overlap, false, `${where}: footer and settings overlap`);
      }
      await page.goto(`${base}/paper-shelf.html`, { waitUntil: 'networkidle' });
      // Each paper's title is its single source link, an inline serif link in running text that keeps at least 24 px
      // (WCAG 2.5.8; WP5 review B3); the Copy reference control keeps a 44 px target.
      const titles = await page.locator('[data-paper-card] .paper-title a').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      const copies = await page.locator('[data-paper-card] [data-paper-copy]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      assert.equal(titles.length + copies.length, 22);
      assert(titles.every(height => height >= 24), `${where}: title link heights ${titles}`);
      assert(copies.every(height => height >= 44), `${where}: Copy reference heights ${copies}`);
      await page.locator('[data-paper-search]').fill('qzxnomatch');
      assert(await page.locator('[data-paper-empty]').isVisible());
      await page.locator('[data-paper-reset]').click();
      assert.equal(await page.locator('[data-paper-card]:visible').count(), 11);
    }
    await page.close();
    console.log(`PASS ${width}px: header band, tagline and gate label, navigation hit targets, brand name, footer clearance`);
  }
} finally {
  await browser.close();
}
