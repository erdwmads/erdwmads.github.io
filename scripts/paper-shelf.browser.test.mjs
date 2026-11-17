// Paper Shelf as a bibliography (spec §4.6): topic groups with counts, year order, one link per paper, formatted
// references, stable and old anchors; the year hangs left of the title from 761 px and runs in before it on phones;
// "My reading" and the Keywords line on every width; Copy reference a visible text button; spacing from the tokens.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE || undefined });
const groupIds = ['dolomite', 'ci-orgueil', 'ryugu-bennu', 'methods', 'chronology'];
// A spacing token in px, read through a probe so the expectation follows 00-tokens.css.
const token = (page, name) => page.evaluate(name => {
  const probe = document.createElement('i');
  probe.style.cssText = `position:absolute;margin-top:var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).marginTop;
  probe.remove();
  return value;
}, name);
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
// Every card: the year sits beside the title's first line (left of it), the reading is labelled, Keywords are shown,
// and Copy reference is a visible text button with a 44 px target.
const readCards = page => page.locator('[data-paper-card]').evaluateAll(cards => cards.map(card => {
  const year = card.querySelector('.paper-year').getBoundingClientRect();
  const firstLine = card.querySelector('.paper-title a').getClientRects()[0];
  const copy = card.querySelector('[data-paper-copy]'), copyBox = copy.getBoundingClientRect(), copyText = copy.querySelector('.paper-copy-text').getBoundingClientRect();
  const tags = card.querySelector('.project-tags');
  return {
    id: card.id,
    yearLeft: year.right <= firstLine.left + 0.5, yearLevel: Math.abs(year.top - firstLine.top),
    reading: card.querySelector('.paper-relevance-label').firstChild.textContent.trim(),
    readingName: card.querySelector('.paper-relevance-label').textContent.trim(),
    keywords: tags.getBoundingClientRect().height > 0 ? tags.innerText.trim() : '',
    copy: { width: copyBox.width, height: copyBox.height, textShown: copyText.width > 1 && copyText.height > 1, name: copy.getAttribute('aria-label') }
  };
}));
function checkCards(cards, label) {
  assert.equal(cards.length, 11);
  for (const card of cards) {
    assert.ok(card.yearLeft && card.yearLevel <= 6, `${label}: year beside the title of ${card.id} ${JSON.stringify(card)}`);
    assert.equal(card.reading, 'My reading', `${label}: ${card.id} reading label`);
    assert.equal(card.readingName, 'My reading, why it matters for my project', `${label}: ${card.id} reading label for assistive technology`);
    assert.match(card.keywords, /^Keywords: \S.* · \S/, `${label}: ${card.id} keywords line`);
    assert.ok(card.copy.width >= 44 && card.copy.height >= 44 && card.copy.textShown && /^Copy reference: \S/.test(card.copy.name), `${label}: Copy reference on ${card.id} ${JSON.stringify(card.copy)}`);
  }
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
    assert.equal(await page.locator('.masthead__meta').innerText(), '11 papers in 5 sections');
    const links = await page.locator('[data-paper-card]').evaluateAll(cards => cards.map(card => [...card.querySelectorAll('a')].map(link => link.closest('.paper-title') ? link.href : 'extra')));
    assert.ok(links.every(list => list.length === 1 && list[0].startsWith('https://doi.org/')), 'the title is the only link on each paper');
    assert.equal(await page.locator('.paper-source').count(), 0);

    // Desktop: the year hangs in the margin column, Copy reference sits in the notes column level with the title.
    checkCards(await readCards(page), `${theme} 1440`);
    const columns = await page.locator('#gregg-2015').evaluate(card => {
      const box = selector => card.querySelector(selector).getBoundingClientRect();
      return { yearRight: box('.paper-year').right, titleLeft: box('.paper-title').left, titleRight: box('.paper-card-body').right, copyLeft: box('[data-paper-copy]').left };
    });
    assert.ok(columns.yearRight < columns.titleLeft && columns.titleRight < columns.copyLeft, `${theme}: margin, text and notes columns ${JSON.stringify(columns)}`);

    assert.equal(await page.locator('#gregg-2015 [data-paper-copy]').getAttribute('data-paper-reference'),
      'Gregg, J. M. et al. (2015). Mineralogy, nucleation and growth of dolomite in the laboratory and sedimentary environment: A review. Sedimentology 62, 1749–1769. https://doi.org/10.1111/sed.12202');
    assert.match(await page.locator('#gregg-2015 [data-paper-copy]').getAttribute('aria-label'), /^Copy reference: Mineralogy, nucleation/);

    // Filters still filter: non-matching cards and empty groups hide, counts follow; a filter is a 44 px toggle.
    const filterBoxes = await page.locator('[data-paper-filter]').evaluateAll(buttons => buttons.map(button => [button.offsetWidth, button.offsetHeight]));
    assert.ok(filterBoxes.every(([width, height]) => width >= 44 && height >= 44), `${theme}: filter targets ${JSON.stringify(filterBoxes)}`);
    await page.locator('[data-paper-filter="chronology"]').click();
    assert.equal(await page.locator('[data-paper-filter="chronology"]').getAttribute('aria-pressed'), 'true');
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
    await checkFilteredRules(page, await token(page, '--ed-space-8'), `${theme} 1440`);

    // Old #paper-N links land on the same paper as before; stable ids work too.
    for (const [hash, id] of [['paper-3', 'fujiya-2023'], ['paper-11', 'lee-nicholson-2009'], ['king-2015', 'king-2015']]) {
      await page.goto(`${base}/paper-shelf.html#${hash}`, { waitUntil: 'networkidle' });
      const landed = await page.locator(`#${id}`).evaluate(card => ({ top: card.getBoundingClientRect().top, rule: getComputedStyle(card).borderTopWidth }));
      assert.ok(landed.top >= -1 && landed.top < 160, `#${hash} should scroll to ${id}: ${landed.top}`);
      assert.equal(landed.rule, '2px', `#${hash} marks ${id}`);
    }
    // Tablet: the year still hangs left of the title.
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(`${base}/paper-shelf.html`, { waitUntil: 'networkidle' });
    checkCards(await readCards(page), `${theme} 1024`);
    assert.deepEqual(errors, []);
    await page.close();
  }

  for (const theme of ['space', 'light']) {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await phone.addInitScript(theme => { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', theme); }, theme);
    await phone.goto(`${base}/paper-shelf.html`, { waitUntil: 'networkidle' });
    const layout = await phone.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      shelf: document.querySelector('.paper-shelf').getBoundingClientRect().height,
      titles: [...document.querySelectorAll('.paper-title a')].map(link => link.getBoundingClientRect().height)
    }));
    assert.equal(layout.overflow, false, `${theme}: horizontal overflow at 390px`);
    // Phones: the year runs in on the title's first line; the text links stay at least 24 px tall (WCAG 2.5.8).
    checkCards(await readCards(phone), `${theme} 390`);
    assert.ok(layout.titles.every(height => height >= 24), `${theme}: title link targets ${layout.titles}`);
    // Re-measured for the rebuilt entries, which show Keywords and the Copy reference label on phones (spec §4.6):
    // 5389 px, with about 5 % headroom.
    console.log(`${theme}: phone shelf ${Math.round(layout.shelf)} px`);
    assert.ok(layout.shelf < 5650, `${theme}: phone shelf is ${Math.round(layout.shelf)} px`);
    await checkFilteredRules(phone, await token(phone, '--ed-space-7'), `${theme} 390`);
    await phone.close();
  }
  console.log('PASS Paper Shelf: grouped by topic and year, one link per paper, formatted references, old and stable anchors, year beside the title on every width, My reading and Keywords on every card, Copy reference as a text button, no stray rules or gaps under filters');
} finally {
  await browser.close();
}
