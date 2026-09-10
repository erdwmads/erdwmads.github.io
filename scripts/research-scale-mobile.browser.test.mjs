import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 for(const width of [320,390,760]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await page.goto(base+'/research.html',{waitUntil:'networkidle'});
  const section=page.locator('.research-scale');await section.scrollIntoViewIfNeeded();await section.locator('img').evaluate(img=>img.decode());
  for(const theme of ['space','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const layout=await section.evaluate(el=>{const image=el.querySelector('img'),figure=el.querySelector('figure'),caption=el.querySelector('figcaption');return {overflow:document.documentElement.scrollWidth>innerWidth,stacked:image.getBoundingClientRect().bottom<=caption.getBoundingClientRect().top+1,fit:getComputedStyle(image).objectFit,gap:el.querySelector('.research-scale__boundary').getBoundingClientRect().top-figure.getBoundingClientRect().bottom};});
   assert.equal(layout.overflow,false);assert.equal(layout.stacked,true);assert.equal(layout.fit,'contain');assert(layout.gap>=0&&layout.gap<=24);
   if(width===390)await section.screenshot({path:process.env.TEMP+'/research-evidence-mobile-'+theme+'.png'});
  }
  await page.close();
 }
 console.log('PASS 320/390/760 mobile flow, complete image proportions, captions and both themes');
}finally{await browser.close();}
