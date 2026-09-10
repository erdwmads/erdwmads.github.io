import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html');
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');await view.scrollIntoViewIfNeeded();const ready=()=>page.waitForFunction(()=>window.sampleMissions&&document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:60000});await ready();
 for(const id of ['hayabusa2','osiris-rex']){await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await view.scrollIntoViewIfNeeded();
   for(const [kind,p] of [['flyby',0],['flyby',.25],['flyby',.5],['flyby',.75],['flyby',1],['launch',0],['launch',.45],['return',0],['return',.65],['landing',.15],['landing',.7],['landing',1]]){
    const stage=missions[id].stages.findIndex(s=>s.kind===kind);await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});if(['launch','return','landing'].includes(kind))await root.locator('[data-mission-action="detail"]').click();await page.waitForTimeout(180);
    assert(await page.evaluate(()=>sampleMissions.state.calls>0));const label=await root.locator('[data-mission-status]').textContent();if(kind==='flyby')assert.match(label,p<.46?/incoming/:p>.54?/outgoing/:/closest/);
    assert.match(await root.locator('[data-mission-source]').getAttribute('href'),/^https:/);
    await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`earth-flyby-${id}-${kind}-${p}-${width}.png`)});
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS both missions: five flyby phases and restored launch/release/recovery Earth context at 1440/390; valid sources and no render errors');
}finally{await browser.close();}
