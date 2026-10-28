// Research hub: the project facts from src/data/project.mjs on Research, Research Log and the graduation page.
// Covers the Analytical Pathway (status chips as text, keyboard disclosure, grid without empty cells),
// the sub-questions, the Orgueil vs returned samples card, the Research Log front door and the trimmed archive hero.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as project from '../src/data/project.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const statuses = project.pathway.map(step => step.status);
// The chip text a sighted reader sees (the hidden 'Status: ' prefix is for screen readers).
const chipText = locator => locator.evaluateAll(chips => chips.map(chip => [...chip.childNodes].filter(node => !node.classList?.contains('visually-hidden')).map(node => node.textContent).join('').trim()));

// Every grid cell is filled: the union of the step boxes covers the grid box (no bare 1px-gap background).
const gridIsFilled = locator => locator.evaluate(list => {
  const box = list.getBoundingClientRect();
  const items = [...list.children].map(item => item.getBoundingClientRect());
  const rows = [...new Set(items.map(item => Math.round(item.top)))];
  return rows.every(top => {
    const row = items.filter(item => Math.round(item.top) === top);
    const width = row.reduce((sum, item) => sum + item.width, 0) + row.length - 1;
    return Math.abs(width - (box.width - 2)) <= 3;
  });
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#research-focus-title').innerText(), project.question);
  assert.deepEqual(await page.locator('.research-question .research-subquestions h3').allInnerTexts(), project.subQuestions.map(item => item.title));
  const pathway = page.locator('[data-analytical-pathway="full"]');
  assert.equal(await pathway.locator('> li').count(), 7);
  assert.deepEqual(await chipText(pathway.locator('.pathway-chip')), statuses, 'chips show the status as visible text');
  assert.deepEqual(await pathway.locator('.pathway-chip .visually-hidden').allTextContents(), statuses.map(() => 'Status: '));
  assert.match(await page.locator('.research-pathway .pathway-status-note').innerText(), /Status as of October 2026 · not a checklist of completed results/);
  assert.doesNotMatch(await page.locator('main').innerText(), /\bCompleted\b/);
  // Keyboard disclosure: Tab reaches the summary, Enter opens it, and the scope text is readable.
  const sem = pathway.locator('[data-step="sem-bse"]');
  await sem.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await sem.locator('details').evaluate(details => details.open), true);
  assert.match(await sem.locator('dl').innerText(), /What it can answer[\s\S]*What it cannot establish[\s\S]*Brightness alone cannot identify dolomite/i);
  await page.keyboard.press('Space');
  assert.equal(await sem.locator('details').evaluate(details => details.open), false);
  assert.ok(await gridIsFilled(pathway), 'full pathway leaves an empty grid cell at 1440');
  const card = page.locator('.comparison-card');
  assert.equal(await card.locator('.comparison-column').count(), 2);
  assert.match(await card.innerText(), /Ryugu and Bennu returned samples[\s\S]*do not establish that Orgueil came from Ryugu, Bennu/);
  const columns = await card.locator('.comparison-column').evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)));
  assert.equal(columns[0], columns[1], 'two columns side by side on desktop');
  assert.equal(await page.locator('#comparison-title').innerText(), 'Orgueil vs returned samples');
  assert.equal(await page.locator('a[href="ryugu-bennu.html"]').count() > 0, true);
  console.log('PASS Research: canonical question, sub-questions, seven status chips, keyboard disclosure, filled grid, comparison card');

  await page.goto(`${base}/research-log.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('h1').innerText(), project.displayTitle);
  const facts = await page.locator('.research-dashboard__facts').innerText();
  for (const text of [project.question, project.targetPhase, project.methodsSummary, 'Taiga Okumura', 'Takashi Mikouchi']) assert.ok(facts.includes(text), text);
  const compact = page.locator('[data-analytical-pathway="compact"]');
  assert.deepEqual(await chipText(compact.locator('.pathway-chip')), statuses);
  assert.equal(await compact.locator('details, .pathway-purpose').count(), 0, 'compact pathway shows titles and chips only');
  assert.equal(await page.locator('main a[href="research-graduation.html"]', { hasText: 'Open protected archive' }).count(), 2);
  const archive = await page.locator('.research-log-archive').textContent();
  for (const term of ['Mission Log', 'Mission Index', 'SOL', 'Figures']) assert.ok(archive.includes(term), term);
  assert.doesNotMatch(await page.locator('main').innerText(), /\bSOL\s*\d|Mission Log \d{2,}|\b20\d\d[-/]\d\d[-/]\d\d\b|\bLOG\s*\d{3}\b/, 'no archive metadata on the public page');
  for (const [width, height] of [[1440, 1000], [1024, 900], [820, 1000]]) {
    await page.setViewportSize({ width, height });
    assert.ok(await gridIsFilled(compact), `compact pathway leaves an empty grid cell at ${width}`);
  }
  console.log('PASS Research Log: display title, project facts, compact pathway, archive description without metadata, two archive links');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
  const hero = page.locator('main > section').first();
  assert.equal(await hero.locator('.pills, .pill').count(), 0, 'archive hero no longer repeats the pills');
  assert.equal(await hero.locator('a[href="research-log.html"]').count(), 1);
  assert.equal(await hero.locator('p.lead').count(), 1);
  assert.equal(await page.locator('[data-research-lock-content] [data-analytical-pathway="compact"] .pathway-chip').count(), 7);
  assert.ok((await page.locator('[data-research-lock-content] .research-formal-title').textContent()).includes(project.formalTitle));
  assert.equal(await page.locator('[data-research-lock-content]').getAttribute('hidden'), '', 'project context stays inside the locked content');
  console.log('PASS graduation page: trimmed hero, project context and compact pathway from project.mjs inside the locked content');

  for (const theme of ['space', 'light']) {
    for (const width of [390, 820, 1024, 1440]) {
      const mobile = width <= 390;
      const narrow = await browser.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
      await narrow.addInitScript(t => { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', t); }, theme);
      const view = await narrow.newPage();
      view.on('pageerror', error => errors.push(error.message));
      for (const file of ['research.html', 'research-log.html', 'research-graduation.html']) {
        await view.goto(`${base}/${file}`, { waitUntil: 'networkidle' });
        await view.evaluate(() => document.querySelectorAll('.pathway-detail').forEach(details => { details.open = true; }));
        const issues = await view.evaluate(() => {
          const found = [];
          if (document.documentElement.scrollWidth > innerWidth + 1) found.push('page scrolls sideways');
          for (const el of document.querySelectorAll('.analytical-pathway, .analytical-pathway li, .comparison-card, .research-subquestions, .research-log-archive__parts')) {
            if (el.scrollWidth > el.clientWidth + 1) found.push(`${el.className || el.tagName}: overflow`);
          }
          for (const chip of document.querySelectorAll('.pathway-chip')) {
            if (!chip.getClientRects().length) continue;
            const size = parseFloat(getComputedStyle(chip).fontSize);
            if (innerWidth <= 760 && size < 12) found.push(`chip text ${size}px on a phone`);
          }
          return found;
        });
        assert.deepEqual(issues, [], `${theme} ${width} ${file}`);
      }
      await narrow.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS layout: no sideways scroll or overflow at 390, 820, 1024 and 1440 in both themes, 12px chip floor on phones');
} finally {
  await browser.close();
}
