// Interaction stability (spec §5 row 37, §6.3): hover never moves geometry. On every page the buttons, Paper Shelf
// filters, ledger links, pathway items and plates in main keep their boxes while the pointer rests on each of them
// (the first eight on the page, then every primitive of WP1's stand-in fixture, so WP1's own hover rules are held
// on every page before any page adopts them);
// the planetary toolbar (Ryugu & Bennu) and the Origins chapters keep their place, and their visible controls fit
// without overlapping, while the reader switches materials, views and chapters. Nothing overflows sideways. Every
// page runs at 1440 and 390 px; Ryugu & Bennu and Origins also at 1024, 768 and 320 px. Filters and the per-page
// report: scripts/lib/guard.mjs.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const geometry = locator => locator.evaluateAll(elements => elements.map(el => {
  const r = el.getBoundingClientRect();
  return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
}));
const drift = (before, after) => after.length !== before.length ? `${before.length} items became ${after.length}` : before.flatMap((box, i) => Object.keys(box).filter(key => Math.abs(box[key] - after[i][key]) >= .6).map(key => `item ${i} ${key} ${box[key].toFixed(1)} -> ${after[i][key].toFixed(1)}`))[0];
const overlap = (boxes, width) => {
  for (const [i, a] of boxes.entries()) {
    if (a.x < -1 || a.x + a.width > width + 1) return `control ${i} does not fit`;
    for (const b of boxes.slice(i + 1)) if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1) return 'controls overlap';
  }
};
const scenes = ['ryugu-bennu', 'origins-study'];

// Rests the pointer on each of the first limit items in turn and reports the first box that moves, for the owner of
// the hovered item.
async function hoverEach(page, items, limit, findings) {
  for (let i = 0; i < Math.min(await items.count(), limit); i++) {
    const item = items.nth(i);
    await item.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(100);
    const before = await geometry(items);
    const box = await item.boundingBox();
    await page.mouse.move(box.x + Math.min(20, box.width / 2), box.y + Math.min(20, box.height / 2));
    await page.waitForTimeout(200);
    const moved = drift(before, await geometry(items));
    if (!moved) continue;
    const { owner, name, edge } = await item.evaluate(el => ({ owner: window.__guardOwner(el), name: window.__guardName(el), edge: Boolean(el.querySelector('.obs-edge-light')) }));
    // R2 retired the pointer edge light; should its hover span (span.obs-edge-light) come back, it is WP2's finding.
    findings.push(edge ? { owner: 'WP2', message: `hovering ${name} inserts span.obs-edge-light, which R2 retires: ${moved}` } : { owner, message: `hovering ${name} moves geometry: ${moved}` });
  }
}

await runGuard('interaction-stability', async (page, { entry, width, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 700 });
  const findings = [];
  const wp4 = message => findings.push({ owner: 'WP4', message });
  if (entry.page === 'ryugu-bennu') {
    const root = page.locator('[data-planetary-explorer]');
    await page.locator('[data-view="minerals"]').click();
    await page.waitForTimeout(500);
    await root.locator('.planetary-navigation').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const controls = root.locator('.planetary-toolbar, .planetary-tools, [data-action="zoom-in"], [data-action="share"], .planetary-materials button');
    const before = await geometry(controls);
    for (const material of ['ryugu', 'orgueil', 'bennu']) {
      await root.locator(`[data-material="${material}"]`).click();
      await page.waitForTimeout(250);
      const moved = drift(before, await geometry(controls));
      if (moved) wp4(`minerals ${material}: ${moved}`);
    }
    for (const view of ['orbit', 'shape', 'sample']) {
      await root.locator(`[data-view="${view}"]`).click();
      await root.locator('[data-material="bennu"]').click();
      await page.waitForTimeout(120);
      const toolbar = () => geometry(root.locator('.planetary-toolbar, [data-share]'));
      const origin = async () => (await geometry(root.locator('.planetary-layout'))).map(({ x, y }) => ({ x, y }));
      const toolbarBefore = await toolbar(), contentBefore = await origin();
      for (const material of ['bennu', 'ryugu', 'orgueil']) {
        await root.locator(`[data-material="${material}"]`).click();
        await page.waitForTimeout(120);
        const moved = drift(toolbarBefore, await toolbar()) || drift(contentBefore, await origin());
        if (moved) wp4(`${view} ${material}: ${moved}`);
        const crowded = overlap(await geometry(root.locator('.planetary-toolbar button:visible, .planetary-toolbar select:visible')), width);
        if (crowded) wp4(`${view} ${material}: ${crowded}`);
      }
    }
  } else if (entry.page === 'origins-study') {
    // Chapters are the study's selection: they and the content origin stay put; every visible control fits.
    await page.waitForFunction(() => window.study);
    const chapters = page.locator('.chapters [data-stage]');
    const origin = async () => (await geometry(page.locator('.observatory'))).map(({ x, y }) => ({ x, y }));
    const chaptersBefore = await geometry(chapters), contentBefore = await origin();
    for (const stage of [1, 2, 3, 0]) {
      await page.locator(`.chapters [data-stage="${stage}"]`).click();
      await page.locator(`.chapters [data-stage="${stage}"][aria-current="step"]`).waitFor();
      await page.waitForTimeout(120);
      const moved = drift(chaptersBefore, await geometry(chapters)) || drift(contentBefore, await origin());
      if (moved) wp4(`chapter ${stage}: ${moved}`);
      const crowded = overlap(await geometry(page.locator('.origins-study :is(button,input):visible')), width);
      if (crowded) wp4(`chapter ${stage}: ${crowded}`);
    }
  }
  if (!scenes.includes(entry.page) || [1440, 390].includes(width)) {
    await hoverEach(page, page.locator('main :is(.button, .paper-filter, .ledger a, .pathway-item, .plate):visible'), 8, findings);
    findings.push(...await page.evaluate(() => window.__guardOverflow()));
    await insertFixture(page);
    await hoverEach(page, page.locator('[data-guard-fixture] :is(.button, .quiet-link, .icon-button, .chip, .ledger a, .plate, summary):visible'), 20, findings);
  } else {
    findings.push(...await page.evaluate(() => window.__guardOverflow()));
  }
  return findings;
}, {
  widths: [1440, 1024, 768, 390, 320],
  skip: (entry, width) => ![1440, 390].includes(width) && !scenes.includes(entry.page)
});
