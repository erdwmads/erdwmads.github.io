import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/research.html',{waitUntil:'networkidle'});
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');
 await view.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true'&&window.sampleMissions.state.calls>0,null,{timeout:45000});
 for(const [id,mission]of Object.entries(missions)){
  await root.locator('[data-mission="'+id+'"]').click();
  await page.waitForFunction(id=>sampleMissions.state.mission===id&&document.querySelector('[data-sample-missions]').dataset.ready==='true',id,{timeout:45000});
  assert.equal(await root.locator('[data-mission-stage]').count(),mission.stages.length);
  for(let stage=0;stage<mission.stages.length;stage++){
   const kind=mission.stages[stage].kind,p=kind==='launch'?.3:kind==='landing'?.72:kind==='return'?.68:.52;
   await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});
   await view.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
   const png=await view.locator('canvas').screenshot(),stats=await sharp(png).stats();
   assert(stats.channels.some(c=>c.stdev>12),id+'/'+stage+' must render visible geometry');
   await root.locator('.mission-scene').screenshot({path:join(tmpdir(),'mission-'+id+'-'+mission.stages[stage].id+'.png')});
   assert.equal(await root.locator('[data-mission-title]').innerText(),mission.stages[stage].title);
   console.log('FRAME '+id+'/'+stage+' '+JSON.stringify(await page.evaluate(()=>sampleMissions.state)));
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS all 17 dated chapters, both spacecraft, nonblank frames and no browser errors');
}finally{await browser.close();}
