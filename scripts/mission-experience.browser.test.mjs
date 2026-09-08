import assert from 'node:assert/strict';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4322';
const passphrase = 'synthetic archive test password';
const entries = Array.from({ length: 11 }, (_, i) => ({
  id: `log-${String(11-i).padStart(3,'0')}`, number: 11-i, label: `LOG ${String(11-i).padStart(3,'0')}`,
  date: `2026/09/${String(11-i).padStart(2,'0')}`, stage: 'Synthetic observation record', question: 'Test question',
  bodyHtml: '<h3>Synthetic record</h3><h4>Observation</h4><p>Test content only.</p><div class="mission-photo-grid"><figure><img src="assets/img/affiliation/mineralogy-laboratory-logo.png" alt="Test figure"><figcaption>Test figure.</figcaption></figure></div>'
}));
const salt = randomBytes(16), iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', pbkdf2Sync(passphrase, salt, 600000, 32, 'sha256'), iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(entries)), cipher.final(), cipher.getAuthTag()]);
const payload = {version:1,kdf:'PBKDF2-SHA-256',iterations:600000,cipher:'AES-256-GCM',salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')};
const browser = await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const failures = [];
async function check(name, fn) { try { await fn(); console.log(`PASS ${name}`); } catch(error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); } }
async function swipe(page, selector, dx, dy=0) {
  const box = await page.locator(selector).boundingBox();
  assert(box);
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width * (dx < 0 ? .85 : .15), y = box.y + Math.min(box.height / 2, 80);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++) {
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(350);
  await client.detach();
}
try {
  const desktop = await browser.newPage({viewport:{width:1440,height:1000}});
  await desktop.addInitScript(()=>sessionStorage.setItem('mads-entry-gate-v1','done'));
  await desktop.goto(`${base}/index.html`);
  await desktop.evaluate(()=>document.fonts.ready);
  if (await desktop.locator('html').evaluate(el=>el.classList.contains('ambient-fx-disabled'))) await desktop.locator('.ambient-fx-toggle').click();
  const control = desktop.locator('main .button').first();
  await control.scrollIntoViewIfNeeded();
  await check('gold and blue edge follows pointer without layout changes',async()=>{
    const box = await control.boundingBox();
    const arrow = await control.evaluate(el=>getComputedStyle(el,'::after').content);
    await desktop.mouse.move(box.x+8,box.y+box.height/2);
    await desktop.waitForTimeout(100);
    const left=await control.evaluate(el=>({angle:el.style.getPropertyValue('--edge-angle'),paint:getComputedStyle(el.querySelector('.obs-edge-light')).backgroundImage}));
    await desktop.mouse.move(box.x+box.width-8,box.y+box.height/2);
    await desktop.waitForTimeout(100);
    const right=await control.evaluate(el=>({angle:el.style.getPropertyValue('--edge-angle'),paint:getComputedStyle(el.querySelector('.obs-edge-light')).backgroundImage}));
    assert.notEqual(left.angle,right.angle);
    const colours=await desktop.evaluate(()=>{const e=document.createElement('span');document.body.append(e);e.style.color='var(--obs-accent)';const gold=getComputedStyle(e).color;e.style.color='var(--obs-cyan)';const blue=getComputedStyle(e).color;e.remove();return {gold,blue};});
    assert(right.paint.includes(colours.gold),`Missing gold: ${right.paint}`);
    assert(right.paint.includes(colours.blue),`Missing blue: ${right.paint}`);
    assert.equal(await control.evaluate(el=>getComputedStyle(el,'::after').content),arrow);
    assert.deepEqual(await control.boundingBox(),box);
    await control.screenshot({path:'.codex_tmp/mission-edge-space.png'});
    await desktop.mouse.move(0,999);
    await desktop.waitForTimeout(50);
    assert.equal(await desktop.locator('[data-edge-active]').count(),0);
  });
  await check('light theme, reduced motion, FX-off and scroll cleanup',async()=>{
    await desktop.locator('.theme-toggle').click();
    await control.hover();
    await desktop.waitForTimeout(100);
    assert.equal(await control.locator('.obs-edge-light').count(),1);
    await control.screenshot({path:'.codex_tmp/mission-edge-light.png'});
    await desktop.mouse.wheel(0,100);
    await desktop.waitForTimeout(100);
    assert.equal(await desktop.locator('[data-edge-active]').count(),0);
    await desktop.emulateMedia({reducedMotion:'reduce'});
    await control.hover();
    assert.equal(await desktop.locator('[data-edge-active]').count(),0);
    await desktop.emulateMedia({reducedMotion:'no-preference'});
    if(!await desktop.locator('html').evaluate(el=>el.classList.contains('ambient-fx-disabled')))await desktop.locator('.ambient-fx-toggle').click();
    await control.hover();
    assert.equal(await desktop.locator('[data-edge-active]').count(),0);
  });
  await check('touch input on a fine-pointer desktop never creates an edge',async()=>{
    await desktop.locator('.ambient-fx-toggle').click();
    assert(await desktop.evaluate(()=>matchMedia('(pointer: fine)').matches&&!document.documentElement.classList.contains('ambient-fx-disabled')));
    await control.dispatchEvent('pointermove',{pointerType:'touch',clientX:120,clientY:540});
    await desktop.waitForTimeout(100);
    assert.equal(await desktop.locator('[data-edge-active], .obs-edge-light').count(),0);
  });
  await desktop.close();
  const coarse=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true});
  await coarse.addInitScript(()=>sessionStorage.setItem('mads-entry-gate-v1','done'));
  await coarse.goto(`${base}/index.html`);
  await check('desktop-width coarse-pointer device never creates an edge',async()=>{
    assert(await coarse.evaluate(()=>matchMedia('(pointer: coarse)').matches));
    // Isolate the pointer guard from the independent mobile ambient-FX policy.
    await coarse.evaluate(()=>document.documentElement.classList.remove('ambient-fx-disabled'));
    await coarse.locator('main .button').first().hover();
    await coarse.waitForTimeout(100);
    assert.equal(await coarse.locator('[data-edge-active], .obs-edge-light').count(),0);
  });
  await coarse.close();
  for (const width of process.env.TEST_EDGE_ONLY ? [] : [390,320]) {
    const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage();
    await page.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
    await page.goto(`${base}/research-graduation.html`);
    await page.locator('[data-research-lock-input]').fill(passphrase);
    await page.locator('[data-research-lock-form] button').click();
    await page.locator('.mission-log-entry:not(.mission-log-entry-placeholder)').waitFor();
    await check(`${width}px scientific figure is not cropped`,async()=>assert.equal(await page.locator('.mission-log-entry img').evaluate(el=>getComputedStyle(el).objectFit),'contain'));
    await check(`${width}px defaults to newest log`,async()=>assert.equal(await page.locator('.mission-log-entry').getAttribute('id'),'log-011'));
    const timeline='[data-mission-index-list]';
    await page.locator(timeline).scrollIntoViewIfNeeded();
    await check(`${width}px timeline swipe and page scroll`,async()=>{
      await page.locator(timeline).evaluate(el=>el.scrollLeft=0);
      const before=await page.locator('.mission-log-entry').getAttribute('id');
      await swipe(page,timeline,-180);
      const forward=await page.locator(timeline).evaluate(el=>el.scrollLeft);
      assert(forward>30,'Timeline did not move');
      await swipe(page,timeline,160);
      assert(await page.locator(timeline).evaluate(el=>el.scrollLeft)<forward,'Reverse swipe did not move');
      assert.equal(await page.locator('.mission-log-entry').getAttribute('id'),before,'Swipe accidentally selected a log');
      const y=await page.evaluate(()=>scrollY);
      await swipe(page,timeline,0,-150);
      assert(Math.abs(await page.evaluate(()=>scrollY)-y)>30,'Vertical scrolling blocked');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');
    });
    await page.locator('[data-private-atlas]').click();
    await page.locator('.evidence-atlas[open]').waitFor();
    await check(`${width}px atlas horizontal swipe and readable details`,async()=>{
      await swipe(page,'.atlas-map',-170);
      assert(await page.locator('.atlas-map').evaluate(el=>el.scrollLeft)>20,'Atlas did not move');
      await page.locator('.atlas-node[data-group="images"]').tap();
      const bounds=await page.locator('.atlas-detail').boundingBox();
      assert(bounds.height>160,'Detail region too small');
      assert(bounds.x>=0 && bounds.x+bounds.width<=width,'Detail out of viewport');
      await page.screenshot({path:`.codex_tmp/mission-atlas-${width}.png`});
    });
    await context.close();
  }
} finally {await browser.close();}
assert.deepEqual(failures,[]);
