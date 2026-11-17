// Research hub: the project facts from src/data/project.mjs on Research, Research Log and the graduation page.
// Covers the Analytical Pathway (status chips as text, keyboard disclosure, ruled rows whose rails repeat the
// status), the sub-questions, the key to the marks (a caption set apart from the steps), the comparison table (three
// columns on desktop, labelled stacked cells on phones, and on phones the same table model, so every cell keeps its
// own material's column header), the hanging lists on the section kicker's line on tablets, the Research Log
// accession record and the trimmed archive hero.
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

// Ruled rows: every step has a 1 px rule under it, and in the full pathway a rail under its number whose line style
// repeats the status (solid for in progress and next, dashed for planned work and the interpretation, which also
// stands at least 32 px apart from the planned steps).
const ruledRows = locator => locator.evaluate(list => [...list.children].map(item => {
  const rail = getComputedStyle(item, '::before');
  return { status: item.dataset.status, rule: getComputedStyle(item).borderBottomStyle + ' ' + parseFloat(getComputedStyle(item).borderBottomWidth), rail: rail.content === 'none' ? 'none' : rail.borderLeftStyle, gap: item.getBoundingClientRect().top - (item.previousElementSibling?.getBoundingClientRect().bottom ?? item.getBoundingClientRect().top) };
}));
// From 761 px a compact row is one line: number, title and chip share a baseline row, with the dotted leader between
// them.
const oneLineRows = locator => locator.evaluate(list => [...list.children].every(item => {
  const tops = [item.querySelector('.research-step-number'), item.querySelector('h3'), item.querySelector('.pathway-chip')].map(el => el.getBoundingClientRect());
  return Math.abs(tops[0].bottom - tops[1].bottom) < 8 && Math.abs(tops[1].bottom - tops[2].bottom) < 8 && tops[1].right <= tops[2].left && getComputedStyle(item, '::after').borderBottomStyle === 'dotted';
}));

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
  assert.match(await page.locator('.research-pathway .pathway-status-note').innerText(), /Status as of October 2026 · not a checklist of completed results/i);
  assert.doesNotMatch(await page.locator('main').innerText(), /\bCompleted\b/);
  // Keyboard disclosure: Tab reaches the summary, Enter opens it, and the scope text is readable.
  const sem = pathway.locator('[data-step="sem-bse"]');
  await sem.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await sem.locator('details').evaluate(details => details.open), true);
  assert.match(await sem.locator('dl').innerText(), /What it can answer[\s\S]*What it cannot establish[\s\S]*Brightness alone cannot identify dolomite/i);
  const columns = await sem.locator('dl > div').evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)));
  assert.equal(columns[0], columns[1], 'the opened scope sets its two answers side by side');
  await page.keyboard.press('Space');
  assert.equal(await sem.locator('details').evaluate(details => details.open), false);
  const rows = await ruledRows(pathway);
  assert.ok(rows.every(row => row.rule === 'solid 1'), JSON.stringify(rows));
  assert.deepEqual(rows.map(row => row.rail), rows.map(row => (['planned', 'interpretation'].includes(row.status) ? 'dashed' : 'solid')), 'rails repeat the status');
  assert.ok(rows.at(-1).status === 'interpretation' && rows.at(-1).gap >= 31, 'the interpretation stands apart');
  // The number hangs in the margin column, left of the title; the chip sits in the notes column, right of it.
  const geometry = await pathway.locator('> li').first().evaluate(item => ['.research-step-number', 'h3', '.pathway-chip'].map(selector => item.querySelector(selector).getBoundingClientRect()));
  assert.ok(geometry[0].right < geometry[1].left && geometry[1].right < geometry[2].left, 'number, title and chip in that order across the row');
  // The key to the marks: a caption (label capitals, not a step heading) at least 40 px below the last step, then five
  // rows, each mark followed by its word.
  const key = page.locator('.marks-key');
  assert.equal(await key.locator('#marks-key-title').innerText(), 'HOW TO READ THE MARKS');
  const apart = await key.evaluate(el => ({ gap: el.getBoundingClientRect().top - el.parentElement.querySelector('.analytical-pathway').getBoundingClientRect().bottom, size: parseFloat(getComputedStyle(el.querySelector('#marks-key-title')).fontSize), steps: el.querySelectorAll('h3').length }));
  assert.ok(apart.gap >= 40 && apart.size <= 12 && apart.steps === 0, `the key reads as a caption set apart from the steps: ${JSON.stringify(apart)}`);
  assert.equal(await key.locator('dl > div').count(), 5);
  assert.ok(await key.locator('.marks-key__mark').evaluateAll(marks => marks.every(mark => mark.querySelector('.marker[aria-hidden="true"]') && mark.textContent.trim().length > 2)));
  // Comparison table: a caption, the two materials as column heads with their designations, two row heads.
  const table = page.locator('table.comparison-table');
  assert.equal(await page.locator('#comparison-title').innerText(), 'Orgueil vs returned samples');
  assert.match(await table.locator('caption').innerText(), /What each material can and cannot show/i);
  assert.deepEqual(await table.locator('thead .comparison-table__designation').allInnerTexts(), [project.comparisonMaterials.orgueil.designation, project.comparisonMaterials.returned.designation]);
  assert.match(await table.innerText(), /Ryugu and Bennu returned samples[\s\S]*do not establish that Orgueil came from Ryugu, Bennu[\s\S]*do not establish Orgueil’s parent body/);
  const cells = await table.locator('tbody tr').first().evaluate(row => [...row.children].map(cell => cell.getBoundingClientRect()).map(box => ({ left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width) })));
  assert.equal(cells.length, 3);
  assert.ok(cells[0].top === cells[1].top && cells[1].top === cells[2].top && cells[0].left < cells[1].left && cells[1].left < cells[2].left, 'three columns on desktop');
  assert.ok(Math.abs(cells[1].width - cells[2].width) <= 2, 'the two materials share the width equally');
  assert.equal(await table.locator('.comparison-table__cell-label:visible').count(), 0, 'cell labels only on phones');
  assert.equal(await page.locator('a[href="ryugu-bennu.html"]').count() > 0, true);
  console.log('PASS Research: canonical question, sub-questions, seven status chips, keyboard disclosure, ruled rows with status rails, key, comparison table');

  await page.goto(`${base}/research-log.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('h1').innerText(), project.displayTitle);
  const facts = await page.locator('.log-facts').innerText();
  for (const text of [project.question, project.targetPhase, 'Taiga Okumura', 'Takashi Mikouchi']) assert.ok(facts.includes(text), text);
  // The methods fact sets one status per line, in the words of methodsSummary.
  assert.equal((await page.locator('.log-facts .log-facts__line').allInnerTexts()).slice(0, 3).join(' · '), project.methodsSummary);
  // The status line is the project's ("Ongoing"), not a pathway status: no marker, so In progress keeps one colour.
  assert.equal(await page.locator('.log-record .masthead__meta .marker').count(), 0, 'the project status line carries no status marker');
  assert.equal(await page.locator('.log-facts dd').nth(2).textContent(), project.methodsSummary, 'the methods read as one run of text without layout');
  const compact = page.locator('[data-analytical-pathway="compact"]');
  assert.deepEqual(await chipText(compact.locator('.pathway-chip')), statuses);
  assert.equal(await compact.locator('details, .pathway-purpose').count(), 0, 'compact pathway shows titles and chips only');
  assert.equal(await page.locator('main a[href="research-graduation.html"]', { hasText: 'Open protected archive' }).count(), 2);
  const archive = await page.locator('.research-log-archive').textContent();
  for (const term of ['Mission Log', 'Mission Index', 'SOL', 'Figures']) assert.ok(archive.includes(term), term);
  assert.doesNotMatch(await page.locator('main').innerText(), /\bSOL\s*\d|Mission Log \d{2,}|\b20\d\d[-/]\d\d[-/]\d\d\b|\bLOG\s*\d{3}\b/, 'no archive metadata on the public page');
  for (const [width, height] of [[1440, 1000], [1024, 900], [820, 1000]]) {
    await page.setViewportSize({ width, height });
    assert.ok(await oneLineRows(compact), `compact pathway rows are one line with a leader at ${width}`);
  }
  // Phones: the title starts on the narrow 40 px hang and keeps its whole width; the chip moves under it.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const rows = await compact.evaluate(list => [...list.children].map(item => {
      const title = item.querySelector('h3');
      const box = title.getBoundingClientRect();
      return { hang: box.left - list.getBoundingClientRect().left, fits: title.scrollWidth <= title.clientWidth + 1 && box.right <= list.getBoundingClientRect().right + 1, chipBelow: item.querySelector('.pathway-chip').getBoundingClientRect().top >= box.bottom - 1 };
    }));
    assert.ok(rows.every(row => row.hang <= 56 && row.fits && row.chipBelow), `compact pathway at ${width}: titles on the 40 px hang, inside their box, chips below (${JSON.stringify(rows)})`);
  }
  console.log('PASS Research Log: display title, accession facts, unmarked project status, compact pathway on one line per step, archive description without metadata, two archive links');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
  const hero = page.locator('main > :is(section, header, div)').first();
  assert.equal(await hero.locator('.pills, .pill').count(), 0, 'archive hero no longer repeats the pills');
  assert.equal(await hero.locator('a[href="research-log.html"]').count(), 1);
  assert.equal(await hero.locator(':is(p.lead, .masthead__lead)').count(), 1);
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
          for (const el of document.querySelectorAll('.analytical-pathway, .analytical-pathway li, .comparison-table, .research-subquestions, .log-facts, .log-parts')) {
            if (el.scrollWidth > el.clientWidth + 1) found.push(`${el.className || el.tagName}: overflow`);
          }
          for (const chip of document.querySelectorAll('.pathway-chip')) {
            if (!chip.getClientRects().length) continue;
            const size = parseFloat(getComputedStyle(chip).fontSize);
            if (innerWidth <= 760 && size < 12) found.push(`chip text ${size}px on a phone`);
          }
          // Phones: the comparison rows stack, and each cell shows the name of its material.
          if (innerWidth <= 760) {
            for (const cell of document.querySelectorAll('.comparison-table tbody td')) {
              const label = cell.querySelector('.comparison-table__cell-label');
              if (getComputedStyle(cell).display !== 'block' || !label?.getClientRects().length) found.push('comparison cell not stacked with its material label');
            }
          }
          return found;
        });
        assert.deepEqual(issues, [], `${theme} ${width} ${file}`);
        if (file !== 'research.html') continue;
        // The table model is the same at every width: the empty corner cell stays (hidden with display: none it would
        // shift the column headers one column left), so each cell keeps its own material's header.
        assert.match(await view.locator('table.comparison-table').ariaSnapshot(), /- row "[^"\n]*":\n\s*- cell\n\s*- columnheader "Research material[^\n]*\n\s*- columnheader "Comparison materials/, `${theme} ${width}: the comparison header row keeps its corner cell before the two material headers`);
        // Tablets: the Q labels, step numbers and section kickers share one hanging line, the folio's second column.
        // Phones: the labels hang in a narrow 40 px column, so the text keeps a reading measure.
        if (width > 760 && width < 1200) {
          const lines = await view.evaluate(() => ['.research-question > .kicker', '.research-pathway > .kicker', '.research-subquestions h3', '.analytical-pathway--full h3'].map(selector => Math.round(document.querySelector(selector).getBoundingClientRect().left)));
          assert.ok(Math.max(...lines) - Math.min(...lines) <= 1, `${theme} ${width}: kickers, questions and step titles start on one line (${lines.join(', ')})`);
        } else if (width <= 760) {
          const hangs = await view.evaluate(() => ['.research-subquestions', '.analytical-pathway--full'].map(selector => { const list = document.querySelector(selector); return Math.round(list.querySelector('h3').getBoundingClientRect().left - list.getBoundingClientRect().left); }));
          assert.ok(hangs.every(hang => hang <= 56), `${theme} ${width}: phone labels hang at most 56 px (${hangs.join(', ')})`);
        }
      }
      await narrow.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS layout: no sideways scroll or overflow at 390, 820, 1024 and 1440 in both themes, 12px chip floor, labelled stacked comparison cells with their own column headers on phones, one hanging line on tablets, a narrow hang on phones');
} finally {
  await browser.close();
}
