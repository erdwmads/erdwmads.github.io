import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html');const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');await view.scrollIntoViewIfNeeded();const ready=()=>page.waitForFunction(()=>sampleMissions?.state.ready,null,{timeout:60000});await ready();
 for(const id of ['hayabusa2','osiris-rex']){await page.evaluate(id=>sampleMissions.choose(id),id);await ready();for(const width of [1440,390]){await page.setViewportSize({width,height:1000});for(const [kind,p] of [['launch',.7],['return',0],['depart',.5],['landing',.8],['landing',.98]]){
  await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage:missions[id].stages.findIndex(s=>s.kind===kind),p});await view.scrollIntoViewIfNeeded();await page.waitForTimeout(180);
  const boxes=await root.locator('.mission-labels span:not([hidden]),.mission-inset:not([hidden])').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${id} ${kind} labels/inset overlap at ${width}`);}
  assert(await page.evaluate(()=>sampleMissions.state.calls>0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await root.locator('.mission-scene').screenshot({path:process.env.TEMP+`/mission-reviewed-${id}-${kind}-${width}.png`});
 }} }
 assert.deepEqual(errors,[]);console.log('PASS final rendered terrain, visible payload/released capsule, inset/label clearance and 1440/390 layouts: 20 frames');
}finally{await browser.close();}
