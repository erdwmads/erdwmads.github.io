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
    // The ORCID iD icon is an interface mark repeated on purpose (every footer, Home, CV, Contact), not content.
    const src=decodeURIComponent(match[1]).replace(/^\//,'');if(!src.startsWith('assets/')||src.startsWith('assets/img/orcid/'))continue;
    const hash=createHash('sha256').update(readFileSync('dist/'+src)).digest('hex');
    assert(!images.has(hash),'Repeated content image: '+file+' '+src+' and '+images.get(hash));images.set(hash,file+' '+src);
  }
}
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/ryugu-bennu.html',{waitUntil:'networkidle'});
  const ids=await page.locator('main h2[id]').evaluateAll(nodes=>nodes.map(n=>n.id));
  assert.deepEqual(ids,['missions-title','planetary-title','research-scale-title']);
  assert.equal(await page.locator('[data-research-scale], [data-material-tabs]').count(),0);
  assert.equal(await page.locator('.research-scale img').count(),1);
  assert.equal(await page.locator('script[src*="research-scale.js"]').count(),0);
  // Print returns a framed figure to static flow, so the whole figure and its scale bars print; the view returns after.
  await page.locator('[data-image-inspector]').scrollIntoViewIfNeeded();await page.waitForSelector('[data-image-inspector][data-inspector-ready]');
  await page.locator('[data-inspector-region="sem-detail"]').click();
  await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});
  const printed=await page.evaluate(()=>{const s=document.querySelector('[data-inspector-stage]').getBoundingClientRect(),i=document.querySelector('[data-inspector-image]').getBoundingClientRect();return {inside:i.left>=s.left-1&&i.top>=s.top-1&&i.right<=s.right+1&&i.bottom<=s.bottom+1,fill:i.width/s.width};});
  assert(printed.inside&&printed.fill>.95,'the printed figure is whole: '+JSON.stringify(printed));
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('[data-image-inspector]').getAttribute('data-zoomed'),'true');
  await page.locator('[data-inspector-region="all"]').click();
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
  // The Research atlas stays with the research question and opens the specimen on the comparison page.
  await page.goto(base+'/research.html',{waitUntil:'networkidle'});
  await page.locator('[data-public-atlas]').click();await page.locator('.evidence-atlas[open]').waitFor();
  assert.equal(await page.locator('.evidence-atlas img').count(),0);
  await page.locator('.atlas-detail a[href*="view=sample"]').click();
  await page.waitForURL('**/ryugu-bennu.html#observe=1&view=sample&material=orgueil');
  await page.waitForFunction(()=>document.querySelector('[data-share-status]')?.textContent==='Saved observation restored');
  assert.equal(await root.getAttribute('data-active-material'),'orgueil');
  await page.locator('.research-scale').scrollIntoViewIfNeeded();await page.locator('.research-scale').screenshot({path:process.env.TEMP+'/research-evidence-desktop.png'});
  await page.locator('.nav a[href="contact.html"]').click();await page.waitForURL('**/contact.html');
  await page.locator('.nav a[href="ryugu-bennu.html"]').click();await page.waitForURL('**/ryugu-bennu.html');
  assert.equal(await page.locator('.research-scale img').count(),1);assert.deepEqual(errors,[]);
  const plain=await browser.newPage({javaScriptEnabled:false});await plain.goto(base+'/ryugu-bennu.html');
  assert.equal(await plain.locator('.research-scale figure').count(),1);await plain.close();
  console.log('PASS image content hashes, one material browser, sample ownership, atlas destination, section order and soft navigation');
}finally{await browser.close();}
