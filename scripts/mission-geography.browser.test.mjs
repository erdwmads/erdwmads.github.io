import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {missions} from '../src/scripts/sample-missions/data.js';
import {locationFor} from '../src/scripts/sample-missions/geography.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html');
 const root=page.locator('[data-sample-missions]'),viewport=root.locator('[data-mission-viewport]');await viewport.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>window.sampleMissions&&document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:60000});await ready();
 for(const id of ['hayabusa2','osiris-rex']){
  await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1100});await viewport.scrollIntoViewIfNeeded();
   for(const kind of ['launch','return','landing']){
    const stage=missions[id].stages.findIndex(s=>s.kind===kind);await page.evaluate(stage=>sampleMissions.select(stage,.45),stage);await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>sampleMissions.state.context),'detail');await root.locator('[data-mission-action="earth"]').click();
    assert.equal(await root.locator('[data-mission-location]').textContent(),locationFor(id,kind).label);
    await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`geography-${id}-${kind}-${width}.png`)});
    await root.locator('[data-mission-action="detail"]').click();await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>sampleMissions.state.context),'detail');
    assert.equal(await page.evaluate(()=>sampleMissions.state.progress),.45,'scale switching preserves time');
    assert.equal(await root.locator('[data-mission-action="detail"]').getAttribute('aria-pressed'),'true');
    await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`detail-${id}-${kind}-${width}.png`)});
    await root.locator('[data-mission-action="earth"]').click();await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>sampleMissions.state.context),'earth');
   }
   for(const [kind,p] of [['cruise',.2],['flyby',.5],['outbound',.95]]){
    const cruise=missions[id].stages.findIndex(s=>s.kind===kind);
    await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage:cruise,p});await page.waitForTimeout(150);
    assert(await root.locator('[data-mission-context]').isHidden());
    assert.match(await root.locator('[data-mission-status]').textContent(),kind==='cruise'?/orbiting the Sun/:kind==='flyby'?/Earth flyby/:/Onward transfer/);
    await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`solar-transfer-${id}-${p}-${width}.png`)});
    const boxes=await root.locator('.mission-labels span:not([hidden])').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom};}));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t,'transfer labels do not overlap');}
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS true mission regions, separate Earth/detail scales, preserved timeline, solar-cruise/flyby/outbound labels, 1440/390 renders and no page/shader errors');
}finally{await browser.close();}
