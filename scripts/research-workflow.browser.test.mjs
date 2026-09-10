import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
const screenshots = process.env.SITE_TEST_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const atlas = page.locator('.evidence-atlas');
  const panel = atlas.locator('.atlas-detail');
  const step = name => atlas.getByRole('tab', { name: new RegExp(name) });
  const open = async () => {
    await page.locator('[data-public-atlas]').click();
    await page.locator('.evidence-atlas[open]').waitFor();
  };
  const closed = async () => {
    assert.equal(await atlas.getAttribute('open'), null);
    assert.equal(await atlas.locator('.atlas-map > *, .atlas-detail > *').count(), 0, 'closed atlas retains content');
    assert.equal(await page.locator('html').evaluate(el => el.classList.contains('mineral-atlas-open')), false);
  };
  await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
  await open();
  assert.deepEqual(await atlas.getByRole('tab').locator('strong').allTextContents(), ['Material', 'Question', 'Methods', 'Evidence'], 'public atlas must be a four-step research workflow, not a logo hub');
  assert.equal(await atlas.locator('img[src*="laboratory-logo"]').count(), 0);
  assert.equal(await step('Material').getAttribute('aria-selected'), 'true');
  assert.equal(await panel.getAttribute('role'), 'tabpanel');
  assert.equal(await panel.getAttribute('aria-labelledby'), await step('Material').getAttribute('id'));
  assert.equal(await panel.locator('img').count(),0);
  assert.match(await panel.locator('a[href*="view=sample"]').getAttribute('href'),/material=orgueil/);
  await step('Question').click();
  assert.match(await panel.innerText(), /How did dolomite form in Orgueil\?/);
  assert.match(await panel.innerText(), /clay|water/i);
  await step('Methods').click();
  for (const method of ['SEM', 'EPMA', 'XRD', 'TEM']) {
    const row = panel.locator('article').filter({ has: page.getByRole('heading', { name: new RegExp(`^${method}`) }) });
    assert.equal(await row.count(), 1, `${method} needs its own explanation`);
    assert.match(await row.innerText(), /Answers/);
    assert.match(await row.innerText(), /Limitations/);
  }
  await step('Evidence').click();
  assert.match(await panel.innerText(), /Public references/);
  assert.match(await panel.innerText(), /Locked experiments/);
  assert.match(await panel.innerText(), /not.*experimental results/i);
  assert.ok(await panel.locator('a[href^="paper-shelf.html#paper-"]').count() > 0);
  assert.equal(await panel.locator('a[href="research-graduation.html"]').count(), 1);
  assert.equal(await atlas.locator('img[src*="mission-log"], table, [data-private-atlas]').count(), 0);
  console.log('PASS public content: four steps, specimen destination, questions, four methods and evidence boundary');

  await step('Material').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await step('Question').getAttribute('aria-selected'), 'true');
  assert.ok(await step('Question').evaluate(el => el === document.activeElement));
  await page.keyboard.press('End');
  assert.equal(await step('Evidence').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await step('Material').getAttribute('aria-selected'), 'true');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await atlas.evaluate(el => el.contains(document.activeElement)), 'focus escaped the modal');
  }
  await atlas.getByRole('button', { name: 'Close research atlas' }).focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await panel.locator('a').last().evaluate(el => el === document.activeElement), 'reverse Tab did not wrap');
  await page.keyboard.press('Escape');
  await closed();
  assert.ok(await page.locator('[data-public-atlas]').evaluate(el => el === document.activeElement));
  for (const event of ['mads:soft-nav-start', 'mads:research-locked', 'pagehide']) {
    await open();
    await page.evaluate(event => (event === 'mads:research-locked' ? document : window).dispatchEvent(new Event(event)), event);
    await closed();
  }
  await open();
  await step('Evidence').click();
  const paper = panel.locator('a[href^="paper-shelf.html#paper-"]').first();
  const href = await paper.getAttribute('href');
  await paper.click();
  await page.waitForURL(`**/${href}`);
  await closed();
  assert.equal(await page.locator(new URL(page.url()).hash).count(), 1);
  await page.locator('.nav a[href="research.html"]').click();
  await page.waitForURL('**/research.html');
  await open();
  assert.equal(await page.locator('.evidence-atlas').count(), 1, 'navigation duplicated atlas');
  assert.equal(await step('Material').getAttribute('aria-selected'), 'true');
  await atlas.getByRole('button', { name: 'Close research atlas' }).click();
  await closed();
  console.log('PASS keyboard, focus return, close/reopen, lifecycle cleanup and public source navigation');

  for (const theme of ['space', 'light']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    for (const [width, height] of [[1440, 900], [1024, 768], [760, 844], [390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height });
      await open();
      for (const name of ['Material', 'Question', 'Methods', 'Evidence']) {
        await step(name).click();
        const violations = await atlas.evaluate(dialog => {
          const issues = [];
          for (const el of [dialog, ...dialog.querySelectorAll('.atlas-map, .atlas-detail, [role="tab"], article, figure')]) {
            if (el.scrollWidth > el.clientWidth + 1) issues.push(`${el.className}: horizontal overflow`);
          }
          const tabs = [...dialog.querySelectorAll('[role="tab"]')].map(el => el.getBoundingClientRect());
          for (let i = 1; i < tabs.length; i++) if (tabs[i].top < tabs[i - 1].bottom - 1) issues.push('steps overlap');
          const map = dialog.querySelector('.atlas-map').getBoundingClientRect();
          const detail = dialog.querySelector('.atlas-detail').getBoundingClientRect();
          if (innerWidth <= 760 && detail.top < map.bottom - 1) issues.push('mobile sections overlap');
          if (detail.height < 100) issues.push('detail viewport too small');
          const box = dialog.getBoundingClientRect();
          if (box.left < 0 || box.right > innerWidth || box.top < 0 || box.bottom > innerHeight) issues.push('dialog outside viewport');
          return issues;
        });
        assert.deepEqual(violations, [], `${theme} ${width} ${name}`);
        if (screenshots && [1440, 390].includes(width) && ['Material', 'Methods'].includes(name)) {
          await atlas.screenshot({ path: path.join(screenshots, `atlas-${theme}-${width}-${name.toLowerCase()}.png`) });
        }
      }
      await page.keyboard.press('Escape');
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open();
  await step('Methods').click();
  assert.equal(await atlas.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0);
  await page.keyboard.press('Escape');
  console.log('PASS responsive layout: 5 viewports, 2 themes, every step; reduced motion');

  await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-private-atlas]').count(), 0, 'private launcher exists before unlock');
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('research-unlocked')), false);
  await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 900 });
  // Synthetic records exercise atlas guards and rendering, never the real archive or its password.
  await page.evaluate(() => {
    const record = document.createElement('article');
    record.className = 'mission-log-entry';
    record.dataset.logQuestion = 'Fixture working question';
    record.dataset.logStage = 'Fixture stage';
    record.dataset.logNextStep = 'Fixture next step';
    record.innerHTML = '<p class="research-note-date">Fixture date</p><h3>Fixture record</h3><div class="research-note-body"><button data-private-atlas>Fixture atlas</button></div><table><caption>Fixture table</caption><tr><td>Fixture value</td></tr></table>';
    document.querySelector('main').prepend(record);
  });
  await page.locator('[data-private-atlas]').click();
  assert.equal(await atlas.getAttribute('open'), null, 'locked private request opened');
  await page.evaluate(() => document.documentElement.classList.add('research-unlocked'));
  await page.locator('[data-private-atlas]').click();
  assert.equal(await atlas.getAttribute('open'), null, 'private request without archive opened');
  await page.evaluate(() => { window.MadsProtectedArchive = {}; });
  await page.locator('[data-private-atlas]').click();
  assert.equal(await atlas.getByRole('tab').count(), 0, 'public workflow leaked into private mode');
  assert.equal(await atlas.locator('.atlas-node').count(), 5);
  assert.equal(await panel.getAttribute('role'), null);
  await atlas.locator('[data-group="tables"]').click();
  assert.equal(await panel.locator('table').innerText(), 'Fixture table\nFixture value');
  await panel.getByRole('button', { name: 'View in Mission Log' }).click();
  await closed();
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'TABLE');
  await page.locator('[data-private-atlas]').click();
  await page.evaluate(() => document.dispatchEvent(new Event('mads:mission-log-rendered')));
  await closed();
  await page.locator('[data-private-atlas]').click();
  await page.evaluate(() => {
    document.documentElement.classList.remove('research-unlocked');
    delete window.MadsProtectedArchive;
    document.dispatchEvent(new Event('mads:research-locked'));
  });
  await closed();
  await open();
  assert.equal(await step('Material').getAttribute('aria-selected'), 'true');
  assert.equal(await atlas.locator('table').count(), 0, 'private content leaked on public reopen');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
  console.log('PASS private atlas fixture: both access guards, five-node graph, table focus return, entry/relock purge and public reopen');
  console.log('Research workflow browser regression passed. Real private archive was not unlocked.');
} finally {
  await browser.close();
}
