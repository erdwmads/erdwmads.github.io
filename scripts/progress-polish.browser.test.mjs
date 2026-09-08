import assert from 'node:assert/strict';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
const { chromium } = await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:52521';
const password = 'synthetic progress fixture';
const entries = [1,2,3].map(n => ({
  id:`log-00${n}`, number:n, label:`LOG 00${n}`, date:`2026/09/0${n}`,
  latestNote:`Recorded observation ${n}`, questionNote:`Unresolved identity ${n}`, nextNote:`Planned analysis ${n}`,
  bodyHtml:`<h3>Original record ${n}</h3><p>Working interpretation only.</p><figure><img src="assets/img/affiliation/mineralogy-laboratory-logo.png" alt="Synthetic figure ${n}"><figcaption>Original caption ${n}</figcaption></figure>`
}));
const salt=randomBytes(16),iv=randomBytes(12);
const cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(password,salt,600000,32,'sha256'),iv);
const ciphertext=Buffer.concat([cipher.update(JSON.stringify(entries)),cipher.final(),cipher.getAuthTag()]);
const payload={version:1,kdf:'PBKDF2-SHA-256',iterations:600000,cipher:'AES-256-GCM',salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')};
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try {
  for(const theme of ['space','light']) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.addInitScript(theme=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',theme);},theme);
    await page.goto(`${base}/cv.html`);
    await page.evaluate(()=>document.fonts.ready);
    const card=page.locator('.cv-edu-card').first();
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0,0);
    await page.waitForTimeout(250);
    const appearance=()=>card.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,border:getComputedStyle(el).borderColor,rect:JSON.stringify(el.getBoundingClientRect())}));
    const before=await appearance();
    await card.hover();await page.waitForTimeout(300);
    assert.deepEqual(await appearance(),before,'Noninteractive education cards must not react like buttons');
    assert.equal(await card.locator('.obs-edge-light').count(),0);
    await card.screenshot({path:`.codex_tmp/progress-card-${theme}.png`});
    await page.goto(`${base}/index.html`);
    const primary=page.locator('main .button:not(.secondary):not(.atlas-launch)').first();
    const secondary=page.locator('main .button.secondary').first();
    assert.notEqual(await primary.evaluate(el=>getComputedStyle(el).boxShadow),await secondary.evaluate(el=>getComputedStyle(el).boxShadow));
    await primary.hover();await page.waitForTimeout(100);
    assert.equal(await primary.locator('.obs-edge-light').count(),1);
    await page.close();
    console.log(`PASS ${theme}: stable passive cards, primary hierarchy, pointer edge`);
  }
  for(const width of [1440,390,320]) {
    const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<700,isMobile:width<700});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
    await page.goto(`${base}/research-graduation.html`);
    assert.equal(await page.locator('.mission-progress').count(),0);
    await page.locator('[data-research-lock-input]').fill(password);
    await page.locator('[data-research-lock-form] button').click();
    await page.locator('.mission-progress').waitFor();
    assert.match(await page.locator('.mission-progress').innerText(),/Recorded observation 3/);
    assert.match(await page.locator('.research-note-body').innerText(),/Original record 3/);
    await page.locator('[data-mission-compare-toggle]').click();
    const comparison=page.locator('[data-mission-comparison]');
    assert.match(await comparison.innerText(),/2026\/09\/02/);
    assert.match(await comparison.innerText(),/2026\/09\/03/);
    assert.equal(await comparison.locator('img').count(),2);
    if(width===1440) {
      await comparison.locator('img').first().click();
      await page.locator('.mission-lightbox.is-open').waitFor();
      assert.match(await page.locator('.mission-lightbox__caption').innerText(),/Original caption 2/);
      await page.locator('.mission-lightbox__close').click();
    }
    await page.locator('[data-mission-compare-select]').selectOption('log-001');
    assert.match(await comparison.innerText(),/Original caption 1/);
    assert.equal(await comparison.locator('img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const columns=await comparison.locator('.mission-comparison-record').evaluateAll(nodes=>nodes.map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})));
    assert.equal(columns[0].y===columns[1].y,width>=700);
    await comparison.screenshot({path:`.codex_tmp/progress-comparison-${width}.png`});
    await page.locator('[data-mission-compare-toggle]').click();
    assert.equal(await comparison.isVisible(),false);
    await page.locator('[data-mission-target="log-002"]').click();
    assert.match(await page.locator('.mission-progress').innerText(),/Recorded observation 2/);
    assert.equal(await page.locator('[data-mission-comparison] img').count(),0);
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
    assert.equal(await page.locator('.mission-progress').count(),0);
    assert.equal(await page.evaluate(()=>window.MadsProtectedArchive),undefined);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`PASS ${width}px: encrypted progress, date comparison, intact record, uncropped images, relock`);
  }
  if(process.env.MISSION_PRIVATE_SOURCE) {
    const original=fs.readFileSync(process.env.MISSION_PRIVATE_SOURCE);
    const realEntries=JSON.parse(original);
    const realIv=randomBytes(12);
    const realCipher=createCipheriv('aes-256-gcm',pbkdf2Sync(password,salt,600000,32,'sha256'),realIv);
    const realPayload={...payload,iv:realIv.toString('base64'),ciphertext:Buffer.concat([realCipher.update(JSON.stringify(realEntries)),realCipher.final(),realCipher.getAuthTag()]).toString('base64')};
    for(const width of [1440,390,320]) {
      const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<700,isMobile:width<700});
      await page.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:realPayload}));
      await page.goto(`${base}/research-graduation.html#log-011`);
      await page.locator('[data-research-lock-input]').fill(password);
      await page.locator('[data-research-lock-form] button').click();
      await page.locator('.mission-progress').waitFor();
      for(const entry of realEntries) {
        await page.locator(`[data-mission-target="${entry.id}"]`).click();
        assert.match(await page.locator('.mission-original-record').innerText(),/./);
        assert.equal(await page.locator('.research-note-body > .mission-progress dd').first().innerText(),entry.latestNote || entry.stageNote || entry.stage);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      await page.locator('[data-mission-target="log-011"]').click();
      await page.locator('.research-note-body').screenshot({path:`.codex_tmp/progress-real-record-${width}.png`});
      await page.locator('[data-mission-compare-toggle]').click();
      await page.locator('[data-mission-comparison] img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-mission-comparison] img')].every(img=>img.complete&&img.naturalWidth>0),{},{timeout:15000});
      await page.locator('[data-mission-comparison]').screenshot({path:`.codex_tmp/progress-real-comparison-${width}.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.close();
      console.log(`PASS ${width}px: all ${realEntries.length} private records render; source content preserved`);
    }
    assert.deepEqual(fs.readFileSync(process.env.MISSION_PRIVATE_SOURCE),original);
  }
} finally {await browser.close();}
