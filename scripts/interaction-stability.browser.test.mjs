import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const failures = [];
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4322';
const geometry = locator => locator.evaluateAll(elements => elements.map(el => {
  const r = el.getBoundingClientRect();
  return { x:r.x+scrollX, y:r.y+scrollY, width:r.width, height:r.height };
}));
const same = (before, after, label) => {
  assert.equal(after.length, before.length, label);
  before.forEach((box,i) => Object.keys(box).forEach(key => assert(Math.abs(box[key]-after[i][key]) < .6, `${label}: item ${i} ${key} ${box[key]} -> ${after[i][key]}`)));
};
try {
  const widths=process.env.TEST_WIDTHS ? process.env.TEST_WIDTHS.split(',').map(Number) : process.env.TEST_QUICK ? [1440] : [1440,1024,768,390,320];
  for (const width of widths) for (const theme of ['space','light']) {
    const context = await browser.newContext({ viewport:{width,height:1000}, hasTouch:width<760, isMobile:width<760 });
    const page = await context.newPage();
    await page.addInitScript(theme => {sessionStorage.setItem('mads-entry-gate-v1','done');sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',theme);}, theme);
    const routes = process.env.TEST_ROUTES?.split(',') || ([1440,390].includes(width) && !process.env.TEST_QUICK ? ['cv','research','index','paper-shelf','photography','contact','research-log','research-graduation','sample-cabinet'] : ['cv','research']);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    for (const route of routes) {
      try {
        await page.goto(`${base}/${route}.html`);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(700);
        if(width>760 && await page.locator('html').evaluate(el=>el.classList.contains('ambient-fx-disabled'))) await page.locator('.ambient-fx-toggle').click();
        if (route === 'cv') {
          const cards = page.locator('.cv-edu-card');
          await cards.first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
          await page.mouse.move(1,1);await page.waitForTimeout(300);
          const targets = page.locator('.cv-edu-card, .cv-edu-card h3, .cv-edu-card p');
          const before = await geometry(targets);
          for (let i=0;i<await cards.count();i++) {
            await cards.nth(i).hover();await page.waitForTimeout(250);
            const box=await cards.nth(i).boundingBox();await page.mouse.move(box.x+60,box.y+40);await page.waitForTimeout(100);
            assert.equal(await cards.nth(i).evaluate(el=>el.hasAttribute('data-edge-active')),false,'Reading surfaces must not receive the action-only pointer edge');
            same(before,await geometry(targets),'CV hover');
          }
          await cards.first().screenshot({path:`.codex_tmp/stable-cv-${width}-${theme}.png`});
        } else if(route === 'research') {
          const root = page.locator('[data-planetary-explorer]');
          await page.locator('[data-view="minerals"]').click();
          await page.waitForTimeout(500);
          await page.evaluate(()=>document.fonts.ready);
          await root.locator('.planetary-navigation').scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          const controls = root.locator('.planetary-toolbar, .planetary-tools, [data-action="zoom-in"], [data-action="share"], [data-action="journey-start"], .planetary-materials button');
          const before = await geometry(controls);
          for (const material of ['ryugu','orgueil','bennu']) {
            await root.locator(`[data-material="${material}"]`).click();
            await page.waitForTimeout(250);
            same(before, await geometry(controls),`Research ${material}`);
          }
          await root.locator('.planetary-toolbar').screenshot({path:`.codex_tmp/stable-research-${width}-${theme}.png`});
          await root.locator('[data-stage]').screenshot({path:`.codex_tmp/stable-model-${width}-${theme}.png`});
          for(const view of ['orbit','shape','sample','origins']) {
            await root.locator(`[data-view="${view}"]`).click();
            await root.locator('[data-material="bennu"]').click();await page.waitForTimeout(120);
            const toolbarBefore=await geometry(root.locator('.planetary-toolbar, [data-share], [data-action="journey-start"]'));
            const contentBefore=(await geometry(root.locator('.planetary-layout'))).map(({x,y})=>({x,y}));
            for(const material of ['bennu','ryugu','orgueil']) {
              await root.locator(`[data-material="${material}"]`).click();await page.waitForTimeout(120);
              same(toolbarBefore,await geometry(root.locator('.planetary-toolbar, [data-share], [data-action="journey-start"]')),`${view} ${material} toolbar`);
              same(contentBefore,(await geometry(root.locator('.planetary-layout'))).map(({x,y})=>({x,y})),`${view} ${material} content origin`);
              const visible=root.locator('.planetary-toolbar button:visible, .planetary-toolbar select:visible, .planetary-origin-controls button:visible');
              const boxes=await geometry(visible);
              for(let i=0;i<boxes.length;i++) {
                assert(boxes[i].x>=-1 && boxes[i].x+boxes[i].width<=width+1,`${view} ${material}: controls fit`);
                for(let j=i+1;j<boxes.length;j++) assert(!(Math.min(boxes[i].x+boxes[i].width,boxes[j].x+boxes[j].width)-Math.max(boxes[i].x,boxes[j].x)>1 && Math.min(boxes[i].y+boxes[i].height,boxes[j].y+boxes[j].height)-Math.max(boxes[i].y,boxes[j].y)>1),`${view} ${material}: controls overlap`);
              }
            }
          }
        } else {
          const items=page.locator('main :is(.card,.paper-card,.pathway-step,.button,.paper-filter):visible');
          for(let i=0;i<Math.min(await items.count(),8);i++) {
            const item=items.nth(i);
            await item.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(100);
            const before=await geometry(items);
            await item.hover();await page.waitForTimeout(200);
            const box=await item.boundingBox();await page.mouse.move(box.x+Math.min(20,box.width/2),box.y+Math.min(20,box.height/2));await page.waitForTimeout(70);
            same(before,await geometry(items),`${route} hover ${i}`);
          }
        }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page must not overflow');
        console.log('PASS',route,width,theme);
      } catch(error) { failures.push(`${route} ${width} ${theme}: ${error.message}`); }
    }
    assert.deepEqual(errors,[],'no page errors');
    await context.close();
  }
} finally { await browser.close(); }
if(failures.length) {console.error(failures.join('\n'));process.exitCode=1;}
