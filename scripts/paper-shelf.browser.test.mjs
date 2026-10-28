// Paper Shelf structure: topic groups with counts, year order, one link per paper,
// formatted references, stable and old anchors, and the compact phone layout.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE || undefined });
const groupIds = ['dolomite', 'ci-orgueil', 'ryugu-bennu', 'methods', 'chronology'];
// Off-screen cards use content-visibility on phones; lay them all out before measuring.
const showAll = '.paper-card{content-visibility:visible!important}';
// Under every filter the gap sits only between visible groups, and the first card shown under a heading has no
// top rule (the heading's own rule is enough), even when the filter hides the groups or cards before it.
async function checkFilteredRules(page, gap, where) {
  const exercised = { hiddenFirstGroup: false, hiddenFirstCard: false };
  for (const filter of await page.locator('[data-paper-filter]').evaluateAll(buttons => buttons.map(button => button.dataset.paperFilter))) {
    await page.locator(`[data-paper-filter="${filter}"]`).click();
    const state = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('[data-paper-group]')];
      return {
        firstGroupHidden: groups[0].hidden,
        visible: groups.filter(group => !group.hidden).map(group => {
          const cards = [...group.querySelectorAll('[data-paper-card]')];
          return { id: group.dataset.paperGroup, gap: getComputedStyle(group).marginTop, firstCardHidden: cards[0].hidden, rules: cards.filter(card => !card.hidden).map(card => getComputedStyle(card).borderTopWidth) };
        })
      };
    });
    const label = `${where}, filter "${filter || 'all'}"`;
    assert.deepEqual(state.visible.map(group => group.gap), state.visible.map((_, i) => i ? gap : '0px'), `${label}: group gaps ${JSON.stringify(state.visible)}`);
    for (const group of state.visible) assert.deepEqual(group.rules, group.rules.map((_, i) => i ? '1px' : '0px'), `${label}: card rules in ${group.id}`);
    exercised.hiddenFirstGroup ||= state.firstGroupHidden;
    exercised.hiddenFirstCard ||= state.visible.some(group => group.firstCardHidden);
  }
  assert.deepEqual(exercised, { hiddenFirstGroup: true, hiddenFirstCard: true }, `${where}: the filters must hide a leading group and a leading card`);
  await page.locator('[data-paper-reset]').click();
}

try {
  for (const theme of ['space', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', theme); }, theme);
    await page.goto(`${base}/paper-shelf.html`, { waitUntil: 'networkidle' });

    const groups = await page.locator('[data-paper-group]').evaluateAll(nodes => nodes.map(node => ({
      id: node.dataset.paperGroup,
      count: node.querySelector('[data-paper-group-count]').textContent.trim(),
      years: [...node.querySelectorAll('[data-paper-card] .paper-year')].map(year => Number(year.textContent))
    })));
    assert.deepEqual(groups.map(group => group.id), groupIds);
    assert.equal(groups.reduce((sum, group) => sum + group.years.length, 0), 11);
    for (const group of groups) {
      assert.equal(group.count, `${group.years.length} ${group.years.length === 1 ? 'paper' : 'papers'}`);
      assert.deepEqual(group.years, [...group.years].sort((a, b) => a - b), `${group.id} is ordered by year`);
    }
    const links = await page.locator('[data-paper-card]').evaluateAll(cards => cards.map(card => [...card.querySelectorAll('a')].map(link => link.closest('.paper-title') ? link.href : 'extra')));
    assert.ok(links.every(list => list.length === 1 && list[0].startsWith('https://doi.org/')), 'the title is the only link on each paper');
    assert.equal(await page.locator('.paper-source').count(), 0);

    // The year is the left marker, level with the title.
    const marker = await page.locator('#gregg-2015').evaluate(card => {
      const year = card.querySelector('.paper-year').getBoundingClientRect(), title = card.querySelector('.paper-title').getBoundingClientRect();
      return { left: year.right <= title.left, top: Math.abs(year.top - title.top) };
    });
    assert.ok(marker.left && marker.top <= 6, `${theme}: year marker ${JSON.stringify(marker)}`);

    assert.equal(await page.locator('#gregg-2015 [data-paper-copy]').getAttribute('data-paper-reference'),
      'Gregg, J. M. et al. (2015). Mineralogy, nucleation and growth of dolomite in the laboratory and sedimentary environment: A review. Sedimentology 62, 1749–1769. https://doi.org/10.1111/sed.12202');
    assert.match(await page.locator('#gregg-2015 [data-paper-copy]').getAttribute('aria-label'), /^Copy reference: Mineralogy, nucleation/);

    // Filters still filter: non-matching cards and empty groups hide, counts follow.
    await page.locator('[data-paper-filter="chronology"]').click();
    assert.equal(await page.locator('[data-paper-card]:visible').count(), 1);
    assert.deepEqual(await page.locator('[data-paper-group]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.paperGroup)), ['chronology']);
    assert.equal(await page.locator('[data-paper-count]').innerText(), '1 of 11 papers');
    assert.equal(await page.locator('[data-paper-count]').getAttribute('role'), 'status');
    await page.locator('[data-paper-filter="dolomite"]').click();
    assert.deepEqual(await page.locator('[data-paper-group]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.paperGroup)), ['dolomite', 'ci-orgueil', 'ryugu-bennu', 'chronology']);
    assert.equal((await page.locator('[data-paper-group="ryugu-bennu"] [data-paper-group-count]').innerText()).trim(), '2 of 5');
    await page.locator('[data-paper-reset]').click();
    assert.equal(await page.locator('[data-paper-group]:visible').count(), 5);
    assert.equal((await page.locator('[data-paper-group="ryugu-bennu"] [data-paper-group-count]').innerText()).trim(), '5 papers');
    await checkFilteredRules(page, '44px', `${theme} 1440`);

    // Old #paper-N links land on the same paper as before; stable ids work too.
    for (const [hash, id] of [['paper-3', 'fujiya-2023'], ['paper-11', 'lee-nicholson-2009'], ['king-2015', 'king-2015']]) {
      await page.goto(`${base}/paper-shelf.html#${hash}`, { waitUntil: 'networkidle' });
      const landed = await page.locator(`#${id}`).evaluate(card => ({ top: card.getBoundingClientRect().top, rule: getComputedStyle(card).borderTopWidth }));
      assert.ok(landed.top >= -1 && landed.top < 160, `#${hash} should scroll to ${id}: ${landed.top}`);
      assert.equal(landed.rule, '2px', `#${hash} marks ${id}`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }

  for (const theme of ['space', 'light']) {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await phone.addInitScript(theme => { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', theme); }, theme);
    await phone.goto(`${base}/paper-shelf.html`, { waitUntil: 'networkidle' });
    await phone.addStyleTag({ content: showAll });
    const layout = await phone.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      shelf: document.querySelector('.paper-shelf').getBoundingClientRect().height,
      copy: [...document.querySelectorAll('[data-paper-copy]')].map(button => {
        const rect = button.getBoundingClientRect(), text = button.querySelector('.paper-copy-text').getBoundingClientRect();
        return { width: rect.width, height: rect.height, textHidden: text.width <= 1 && text.height <= 1, name: button.getAttribute('aria-label') };
      }),
      titles: [...document.querySelectorAll('.paper-title a')].map(link => link.getBoundingClientRect().height),
      tagsShown: [...document.querySelectorAll('.paper-card .project-tags')].some(tags => tags.getBoundingClientRect().height > 0)
    }));
    assert.equal(layout.overflow, false, `${theme}: horizontal overflow at 390px`);
    assert.ok(layout.copy.every(button => button.width >= 44 && button.height >= 44 && button.textHidden && /^Copy reference: /.test(button.name)), `${theme}: copy icon buttons ${JSON.stringify(layout.copy[0])}`);
    assert.ok(layout.titles.every(height => height >= 44), `${theme}: title link targets ${layout.titles}`);
    assert.equal(layout.tagsShown, false);
    // 4193 px before the grouped layout (2026-10-24); keep the phone shelf well below it.
    assert.ok(layout.shelf < 3700, `${theme}: phone shelf is ${Math.round(layout.shelf)} px`);
    await checkFilteredRules(phone, '32px', `${theme} 390`);
    await phone.close();
  }
  console.log('PASS Paper Shelf: grouped by topic and year, one link per paper, formatted references, old and stable anchors, compact phone layout, no stray rules or gaps under filters');
} finally {
  await browser.close();
}
