
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const entries=process.env.MISSION_PRIVATE_SOURCE?JSON.parse(fs.readFileSync(process.env.MISSION_PRIVATE_SOURCE,'utf8')):[2,1].map(n=>({id:'log-00'+n,number:n,label:'LOG 00'+n,date:'2026/09/0'+n,latestNote:'A recorded observation',questionNote:'An open question',nextNote:'A planned measurement',bodyHtml:'<p class="mission-entry-kicker">LOG 00'+n+'</p><h3>A dated observation record</h3><div class="mission-photo-grid">'+Array.from({length:7},(_,i)=>'<figure><img src="assets/img/affiliation/mineralogy-laboratory-logo.png" alt="Layout test"><figcaption><strong>Fig. '+(i+1)+' - Supplementary observations of a prepared surface.</strong> A long description must remain readable below its title, without narrow columns or cropped text.</figcaption></figure>').join('')+'</div>'}));
const password='synthetic layout fixture',salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(password,salt,600000,32,'sha256'),iv);
const payload={version:1,kdf:'PBKDF2-SHA-256',iterations:600000,cipher:'AES-256-GCM',salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:Buffer.concat([cipher.update(JSON.stringify(entries)),cipher.final(),cipher.getAuthTag()]).toString('base64')};
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{for(const width of [1440,1024,768,390,320]){
const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
await page.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:52523')+'/research-graduation.html');
await page.locator('[data-research-lock-input]').fill(password);await page.locator('[data-research-lock-form] button').click();await page.locator('.mission-record-header').waitFor();
for(const entry of entries){
await page.locator('[data-mission-target="'+entry.id+'"]').evaluate(e=>e.click());
for(const theme of ['space','light']){
await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.toggleAttribute('data-theme-space',theme==='space');},theme);
const record=page.locator('.mission-log-entry');
assert.equal(await record.locator('.research-note-date').count(),1,'One Log label per record');
assert.equal(await record.locator('.mission-original-record button').count(),0,'Tools stay outside original narrative');
const geometry=await record.evaluate(el=>{
const r=e=>e.getBoundingClientRect();
const captions=[...el.querySelectorAll('figcaption')].map(e=>({display:getComputedStyle(e).display,clipped:r(e).bottom>r(e.parentElement).bottom+1,overflow:e.scrollWidth>e.clientWidth+1,titleWidth:e.querySelector('strong')?.getBoundingClientRect().width,available:r(e).width-parseFloat(getComputedStyle(e).paddingLeft)-parseFloat(getComputedStyle(e).paddingRight)}));
const buttons=[...el.querySelectorAll('.mission-record-actions button')],bounds=buttons.map(r);
return {captions,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,buttons:buttons.length,tools:el.querySelectorAll('[data-present-mission],[data-private-atlas],[data-mission-compare-toggle]').length,ordered:bounds.every((b,i)=>!i||b.y>=bounds[i-1].y-.5&&(b.y>bounds[i-1].y+.5||b.x>=bounds[i-1].right-1))};});
assert(!geometry.pageOverflow);assert.equal(geometry.buttons,geometry.tools);assert(geometry.ordered,'Keyboard and visual toolbar order agree');
assert(geometry.captions.every(c=>c.display==='block'&&!c.clipped&&!c.overflow&&(!c.titleWidth||c.titleWidth>=c.available-2)),JSON.stringify({width,theme,entry:entry.id,captions:geometry.captions}));
}
}
await page.locator('[data-mission-target="'+entries[0].id+'"]').evaluate(e=>e.click());
await page.locator('.mission-record-header').screenshot({path:path.join(os.tmpdir(),'mission-header-'+width+'.png')});
if(await page.locator('[data-present-mission]').count()){
await page.locator('[data-present-mission]').click();await page.locator('.obs-presentation[open]').waitFor();
assert(await page.locator('.obs-presentation img').getAttribute('src'));await page.keyboard.press('Escape');
assert.equal(await page.locator('.obs-presentation[open]').count(),0);
}
await page.locator('[data-mission-compare-toggle]').click();assert(await page.locator('[data-mission-comparison]').isVisible());await page.locator('[data-mission-compare-toggle]').click();
await page.locator('[data-private-atlas]').click();await page.locator('.evidence-atlas[open]').waitFor();await page.keyboard.press('Escape');
await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
assert.equal(await page.locator('.mission-record-header').count(),0);assert.equal(await page.evaluate(()=>window.MadsProtectedArchive),undefined);assert.deepEqual(errors,[]);await page.close();
console.log('PASS '+width+'px: '+entries.length+' records, both themes, captions, tools, presentation, comparison, atlas, relock');
}}finally{await browser.close();}
