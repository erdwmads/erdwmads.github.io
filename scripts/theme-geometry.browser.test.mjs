import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const results=[];
try{for(const width of [1536,390,320])for(const route of ['index','research','cv','paper-shelf','photography','contact','research-graduation','research-log']){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/'+route+'.html');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
 if(width<761)await page.locator('.nav-toggle').click();
 const capture=()=>page.evaluate(()=>Array.from(document.querySelectorAll('.nav a,.theme-toggle,main .button,main .pill,main button,main input,main select,.nav-log-gate')).filter(e=>e.getBoundingClientRect().width>0).map((e,i)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{id:i,text:e.textContent.trim().slice(0,55),cls:e.className,x:r.x,y:r.y+scrollY,w:r.width,h:r.height,weight:s.fontWeight,padding:s.padding,border:s.borderWidth,spacing:s.letterSpacing,font:s.fontFamily};}));
 const dark=await capture();await page.locator('.theme-toggle').first().evaluate(e=>e.click());await page.waitForTimeout(500);const light=await capture();
 results.push({width,route,diffs:dark.map((d,i)=>({dark:d,light:light[i]})).filter(({dark:d,light:l})=>!l||['x','y','w','h'].some(k=>Math.abs(d[k]-l[k])>.5))});await page.close();
}}finally{await browser.close();}
console.log(results.map(r=>({width:r.width,page:r.route,drift:r.diffs.length})));assert.deepEqual(results.filter(r=>r.diffs.length),[], 'Theme switching must preserve all visible control bounds');