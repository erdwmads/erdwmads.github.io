import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
// Catch duplicate files as well as duplicate URLs in published content.
const images=new Map();
for(const file of readdirSync('dist').filter(file=>file.endsWith('.html'))){
  const html=readFileSync('dist/'+file,'utf8');
  for(const match of html.matchAll(/<img\b[^>]*?\bsrc="([^"#?]+)"/g)){
    const src=decodeURIComponent(match[1]).replace(/^\//,'');if(!src.startsWith('assets/'))continue;
    const hash=createHash('sha256').update(readFileSync('dist/'+src)).digest('hex');
    assert(!images.has(hash),'Repeated content image: '+file+' '+src+' and '+images.get(hash));images.set(hash,file+' '+src);
  }
}
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/research.html',{waitUntil:'networkidle'});
  const ids=await page.locator('main h2[id]').evaluateAll(nodes=>nodes.map(n=>n.id));
  assert.deepEqual(ids,['research-focus-title','missions-title','planetary-title','research-scale-title','research-methods-title']);
  assert.equal(await page.locator('[data-research-scale], [data-material-tabs]').count(),0);
  assert.equal(await page.locator('.research-scale img').count(),1);
  assert.equal(await page.locator('script[src*="research-scale.js"]').count(),0);
  const root=page.locator('.planetary');await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  for(const material of ['bennu','ryugu','orgueil']){
    await root.locator('[data-material="'+material+'"]').click();await root.locator('[data-view="sample"]').click();
    await root.locator('[data-sample-image]').evaluate(img=>img.decode());
    const count=await root.locator('[data-sample-image]').evaluate(img=>[...document.querySelectorAll('main img')].filter(other=>other.src===img.src).length);
    assert.equal(count,1,material+' specimen has one home');
  }
  await root.locator('[data-view="shape"]').click();
  assert.equal(await root.locator('[data-ci-figure] img').count(),0);
  await root.locator('[data-action="show-sample"]').click();assert.equal(await root.getAttribute('data-mode'),'sample');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.view),'sample');
  await page.locator('[data-public-atlas]').click();await page.locator('.evidence-atlas[open]').waitFor();
  assert.equal(await page.locator('.evidence-atlas img').count(),0);
  await page.locator('.atlas-detail a[href*="view=sample"]').click();
  await page.waitForFunction(()=>!document.querySelector('.evidence-atlas').open&&document.querySelector('[data-share-status]').textContent==='Saved observation restored');
  assert.equal(await root.getAttribute('data-active-material'),'orgueil');
  await page.locator('.research-scale').scrollIntoViewIfNeeded();await page.locator('.research-scale').screenshot({path:process.env.TEMP+'/research-evidence-desktop.png'});
  await page.locator('.nav a[href="contact.html"]').click();await page.waitForURL('**/contact.html');
  await page.locator('.nav a[href="research.html"]').click();await page.waitForURL('**/research.html');
  assert.equal(await page.locator('.research-scale img').count(),1);assert.deepEqual(errors,[]);
  const plain=await browser.newPage({javaScriptEnabled:false});await plain.goto(base+'/research.html');
  assert.equal(await plain.locator('.research-scale figure').count(),1);await plain.close();
  console.log('PASS image content hashes, one material browser, sample ownership, atlas destination, section order and soft navigation');
}finally{await browser.close();}
