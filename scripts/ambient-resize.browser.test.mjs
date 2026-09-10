import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const failures=[];
try{
 for(const initialWidth of [390,1440]){
  const page=await browser.newPage({viewport:{width:initialWidth,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Optional source overlay permits the regression to run before a shared build.
  if(process.env.SITE_TEST_SOURCE_OVERLAY==='1')for(const name of ['ambient-space','interface-2046']){
   const body=await readFile(new URL('../public/assets/js/'+name+'.js',import.meta.url),'utf8');
   await page.route('**/assets/js/'+name+'.js*',route=>route.fulfill({contentType:'application/javascript',body}));
  }
  await page.addInitScript(()=>{
   sessionStorage.setItem('mads-cosmic-arrival-v1','done');
   localStorage.setItem('madsAmbientFxEnabled','1');
   const live=new Set(),set=window.setInterval.bind(window),clear=window.clearInterval.bind(window);
   window.setInterval=(fn,delay,...args)=>{const id=set(fn,delay,...args);if(delay===1900)live.add(id);return id;};
   window.clearInterval=id=>{live.delete(id);return clear(id);};
   window.ambientIntervalCount=()=>live.size;
  });
  await page.goto(base+'/contact.html',{waitUntil:'networkidle'});
  await page.addStyleTag({content:'main { min-height:300vh!important; }'});
  async function check(width,expected,label){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(200);
   const state=await page.evaluate(()=>({layers:document.querySelectorAll('.ambient-space-layer').length,rails:document.querySelectorAll('.ui2046-layer').length,progress:document.querySelectorAll('.ui2046-progress').length,intervals:window.ambientIntervalCount()}));
   for(const [key,value] of Object.entries(expected))if(state[key]!==value)failures.push(initialWidth+' '+label+' '+key+': expected '+value+', got '+state[key]);
  }
  await check(1440,{layers:1,rails:1,progress:1,intervals:1},'desktop');
  for(let i=0;i<2;i++){
   await check(390,{layers:0,rails:0,progress:0,intervals:0},'mobile '+i);
   await check(1440,{layers:1,rails:1,progress:1,intervals:1},'desktop restored '+i);
  }
  await page.evaluate(()=>document.querySelector('.ambient-fx-toggle').click());
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mads:power-state',{detail:window.__madsPowerState})));
  await check(1440,{layers:0,intervals:0},'FX off');
  await page.evaluate(()=>document.querySelector('.ambient-fx-toggle').click());
  await check(1440,{layers:1,rails:1,progress:1,intervals:1},'FX on');
  const planet=page.locator('.ui2046-system-orbit .ui2046-planet').first();
  if(await planet.count()){
   const position=await planet.getAttribute('style');await page.waitForTimeout(120);
   if(position===await planet.getAttribute('style'))failures.push(initialWidth+' restored orbit is frozen');
  }else failures.push(initialWidth+' restored orbital system is absent');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(100);
  const progress=await page.locator('.ui2046-progress span').count()?await page.locator('.ui2046-progress span').evaluate(el=>Number(el.style.getPropertyValue('--scroll-progress'))):0;
  if(progress<.99)failures.push(initialWidth+' restored progress beam does not reach page bottom: '+progress);
  assert.deepEqual(errors,[]);await page.close();
 }
 assert.deepEqual(failures,[]);
 console.log('PASS ambient resize: mobile/desktop restoration, connected progress, singleton meteor timers and FX toggles.');
}finally{await browser.close();}
