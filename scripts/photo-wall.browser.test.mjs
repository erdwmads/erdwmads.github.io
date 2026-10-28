import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
// Groups the photo tiles into rendered rows, in DOM order, relative to the wall.
const wallRows = page => page.locator('.photo-wall').evaluate(wall => {
  const box = wall.getBoundingClientRect();
  const rows = [];
  for (const tile of wall.querySelectorAll('.photo-tile')) {
    const r = tile.getBoundingClientRect();
    const item = { index: Number(tile.dataset.photoIndex), x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height, wide: tile.classList.contains('photo-tile--wide') };
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - item.y) < 1) row.push(item); else rows.push([item]);
  }
  const style = getComputedStyle(wall);
  return { width: box.width, gap: parseFloat(style.columnGap), display: style.display, rows };
});
// Justified rows: reading order runs row by row, each row starts at the left edge, its photographs share one
// height, it ends at the right edge (the last row too) and the next row follows one gap below.
function assertJustified({ width, gap, rows }, label) {
  let order = 0;
  rows.forEach((row, rowIndex) => {
    row.forEach((item, i) => {
      assert.equal(item.index, order++, `${label}: tile order is not row by row`);
      const expectedX = i ? row[i - 1].x + row[i - 1].width + gap : 0;
      assert.ok(Math.abs(item.x - expectedX) < 1, `${label}: gap or hole before tile ${item.index}`);
      assert.ok(Math.abs(item.height - row[0].height) < 1, `${label}: uneven heights in row ${rowIndex}`);
    });
    const end = row.at(-1).x + row.at(-1).width;
    assert.ok(Math.abs(end - width) < 1, `${label}: row ${rowIndex} ends ${(width - end).toFixed(1)}px short of the wall`);
    if (rowIndex) assert.ok(Math.abs(row[0].y - (rows[rowIndex - 1][0].y + rows[rowIndex - 1][0].height + gap)) < 1, `${label}: vertical hole above row ${rowIndex}`);
  });
}
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // The viewer commits its counter only after the photograph has loaded and decoded; a failed load shows Retry instead.
  const shown = () => page.waitForFunction(() => document.querySelector('.obs-presentation-counter').textContent || (!document.querySelector('.obs-present-retry').hidden && 'image failed to load')).then(result => result.jsonValue());
  for (const width of [1440, 760, 390, 320]) {
    for (const theme of ['space', 'light']) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
      await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('.photo-wall img').count(), 21);
      assert.equal(await page.locator('.slideshow-stage, .filmstrip, .photo-marquee').count(), 0);
      const wall = await wallRows(page);
      assert.equal(wall.display, 'flex');
      assert.equal(wall.gap, width <= 760 ? 10 : 16);
      assertJustified(wall, `${theme} ${width}px`);
      // Phones show one or two photographs per row; the panorama is simply the widest tile.
      if (wall.width <= 520) assert.ok(wall.rows.every(row => row.length <= 2), 'more than two photographs in a phone row');
      const tiles = wall.rows.flat();
      assert.ok(tiles.find(item => item.wide).width >= Math.max(...tiles.map(item => item.width)) - .5, 'panorama is not the widest tile');
      const bounds = await page.locator('.photo-wall img').evaluateAll(images => images.map(img => {
        const r = img.getBoundingClientRect();
        const tile = img.closest('a').getBoundingClientRect();
        return { width: r.width, height: r.height, ratio: img.width / img.height, original: Number(img.getAttribute('width')) / Number(img.getAttribute('height')), tileWidth: tile.width, tileHeight: tile.height };
      }));
      for (const box of bounds) {
        assert.ok(Math.abs(box.width / box.height - box.original) < .015, 'photo ratio changed');
        assert.ok(Math.abs(box.tileWidth - box.width) < 1 && Math.abs(box.tileHeight - box.height) < 1, 'photo has a padded frame');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      // At 1x the first tile fits the 480w thumbnail tier.
      const firstSrc = await page.waitForFunction(() => { const img = document.querySelector('[data-photo-index="0"] img'); return img.complete && img.currentSrc; }).then(result => result.jsonValue());
      assert.match(firstSrc, /\/assets\/img\/thumbs\/photography\/photo-01\.webp$/);
      const tile = page.locator('[data-photo-index="3"]');
      await tile.click();
      assert.equal(await shown(), '04 / 21');
      assert.ok((await page.locator('.obs-presentation-stage img').getAttribute('src')).includes('%284%29'));
      await page.keyboard.press('ArrowRight');
      assert.equal(await shown(), '05 / 21');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
      assert.ok(await page.locator('[data-photo-index="4"]').evaluate(el => document.activeElement === el));
      await tile.focus();
      await page.keyboard.press('Enter');
      assert.equal(await shown(), '04 / 21');
      await page.locator('.obs-present-close').click();
      await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
    }
  }
  // The rows follow the wall when the window is resized in place.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
  for (const width of [1180, 1024, 820, 600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(width => innerWidth === width, width);
    assertJustified(await wallRows(page), `resized to ${width}px`);
  }
  assert.deepEqual(errors, []);
  // The photograph controls keep their space until the scripts reveal them, so the wall does not shift down on load:
  // with the revealing scripts blocked, the wall starts where it ends up (within the 2px the scripted Present icon adds).
  for (const width of [1440, 390]) {
    const wallTop = async block => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      if (block) await context.route(/\/_astro\/LegacyShell[^/]*\.js$|observatory-interactions\.js/, route => route.abort());
      const blockedPage = await context.newPage();
      await blockedPage.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
      const result = await blockedPage.locator('.photo-wall').evaluate(wall => ({ top: wall.getBoundingClientRect().top, hidden: [...document.querySelectorAll('.obs-photo-tools > [hidden]')].length }));
      await context.close();
      return result;
    };
    const [revealed, waiting] = [await wallTop(false), await wallTop(true)];
    assert.equal(revealed.hidden, 0);
    assert.equal(waiting.hidden, 2, 'blocked scripts still revealed the photograph controls');
    assert.ok(Math.abs(revealed.top - waiting.top) < 3, `photo wall shifts ${(revealed.top - waiting.top).toFixed(1)}px when the controls appear at ${width}px`);
  }
  // The rows are plain CSS (row breaks chosen at build time), so they need no JavaScript.
  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nojsPage = await nojs.newPage();
  for (const width of [1440, 820, 390]) {
    await nojsPage.setViewportSize({ width, height: 900 });
    await nojsPage.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
    assertJustified(await wallRows(nojsPage), `no-JS ${width}px`);
  }
  await nojs.close();
  // A 3x phone takes the 640w WebP tier (1600w for the panorama) and never downloads an original JPEG until a photograph is opened.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const phonePage = await phone.newPage();
  const originals = [];
  phonePage.on('request', request => { if (decodeURIComponent(request.url()).includes('/assets/img/photo (')) originals.push(request.url()); });
  await phonePage.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
  for (const [index, tier] of [[0, /\/assets\/img\/photography\/w640\/photo-01\.webp$/], [10, /\/assets\/img\/photography\/w1600\/photo-11\.webp$/]]) {
    await phonePage.locator(`[data-photo-index="${index}"]`).scrollIntoViewIfNeeded();
    const src = await phonePage.waitForFunction(index => { const img = document.querySelector(`[data-photo-index="${index}"] img`); return img.complete && img.currentSrc; }, index).then(result => result.jsonValue());
    assert.match(src, tier);
  }
  assert.equal(await phonePage.locator('[data-photo-index="0"]').getAttribute('href'), 'assets/img/photo%20%281%29.jpg');
  assert.equal(await phonePage.locator('[data-photo-index="0"] img').getAttribute('data-full-src'), 'assets/img/photo%20%281%29.jpg');
  assert.deepEqual(originals, [], 'phone wall downloaded an original JPEG');
  await phone.close();
  console.log('Photo wall: 21 unique uncropped tiles in justified rows without holes (row order, phone pairs, resize, no JavaScript needed, no shift when the controls appear), no frames/overflow, srcset tiers, selected image, keyboard and focus passed.');
} finally { await browser.close(); }
