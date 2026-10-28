// Ryugu & Bennu and Origins: an evidence status line sits directly under each scene or figure title at reading size
// with body-text colour, prose keeps a 12px floor, the calibrated caveats are not fine print, and the meta
// descriptions stay within 155 characters. Both themes, desktop and phone.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const pages={
 'ryugu-bennu.html':{titles:['#missions-title','#planetary-title','#research-scale-title'],tags:['Illustrative model','Illustrative model','Literature'],caveats:['.mission-footnote p','.planetary-boundary','.research-scale__boundary']},
 'origins-study.html':{titles:['.study-intro h1','#mineral-budget-title'],tags:['Illustrative model','Literature'],caveats:['.study-project-context','.scene-note p'],hash:'#stage=2&progress=.92'}
};
try{
 for(const theme of ['space','light'])for(const [width,mobile] of [[1440,false],[390,true]]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  await context.addInitScript(t=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',t);},theme);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,spec] of Object.entries(pages)){
   await page.goto(`${base}/${name}${spec.hash||''}`,{waitUntil:'networkidle'});
   const where=`${name} ${theme} ${width}`;
   const description=await page.locator('meta[name="description"]').getAttribute('content');
   assert.ok(description.length<=155,`${where}: meta description has ${description.length} characters`);
   const lines=await page.evaluate(titles=>titles.map(selector=>{
    const title=document.querySelector(selector),body=getComputedStyle(document.body);
    // The status line follows its title, or the title's one-line lead (Origins' intro), or the heading wrapper
    // that holds the title (two levels on Origins' mineral budget).
    let status=title.nextElementSibling;
    if(status?.matches('.lead'))status=status.nextElementSibling;
    for(let wrapper=title.parentElement,depth=0;!status?.matches('[data-evidence-status]')&&depth<2;wrapper=wrapper.parentElement,depth++)status=wrapper.nextElementSibling;
    if(!status?.matches('[data-evidence-status]'))return {selector,missing:true};
    const style=getComputedStyle(status),tag=status.querySelector('.evidence-status__tag'),probe=document.createElement('span');
    probe.style.color='var(--obs-text)';status.append(probe);const text=getComputedStyle(probe).color;probe.remove();
    const rect=status.getBoundingClientRect(),titleRect=title.getBoundingClientRect();
    return {selector,size:parseFloat(style.fontSize),color:style.color,text,tag:tag.firstChild.textContent.trim(),tagVisible:tag.getBoundingClientRect().width>0,gap:rect.top-titleRect.bottom,visible:rect.height>0};
   }),spec.titles);
   lines.forEach((line,i)=>{
    assert.ok(!line.missing,`${where}: no evidence status under ${line.selector}`);
    assert.ok(line.visible,`${where}: status under ${line.selector} is visible`);
    assert.equal(line.tag,spec.tags[i],`${where}: tag under ${line.selector}`);
    assert.ok(line.size>=14&&line.size<=15,`${where}: status under ${line.selector} is ${line.size}px`);
    assert.equal(line.color,line.text,`${where}: status under ${line.selector} uses the body-text colour`);
    assert.ok(line.gap>=-1&&line.gap<120,`${where}: status sits directly under ${line.selector} (${line.gap}px)`);
   });
   const caveats=await page.evaluate(selectors=>selectors.map(s=>{const e=document.querySelector(s);return {s,size:e?parseFloat(getComputedStyle(e).fontSize):0};}),spec.caveats);
   for(const {s,size} of caveats)assert.ok(size>=13,`${where}: caveat ${s} is ${size}px`);
   // Prose floor: sentences in paragraphs, list items, definitions and captions are at least 12px. Live status
   // readouts and shared page furniture outside these sections are not prose.
   const small=await page.evaluate(()=>[...document.querySelectorAll('main :is(p,li,dd,figcaption)')].filter(e=>{
    if(e.closest('[hidden],details:not([open]),[role="status"],.continue-reading,.research-guide')||!e.getClientRects().length)return false;
    const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    return text.split(/\s+/).length>=3&&parseFloat(getComputedStyle(e).fontSize)<12;
   }).map(e=>`${e.className||e.tagName} ${getComputedStyle(e).fontSize}: ${e.textContent.trim().slice(0,50)}`));
   assert.deepEqual(small,[],`${where}: prose under 12px`);
  }
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`PASS evidence status, caveat size and prose floor: ${theme} ${width}`);
 }
}finally{await browser.close();}
