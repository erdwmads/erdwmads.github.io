import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try {
  for(const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(`${process.env.SITE_TEST_URL||'http://127.0.0.1:52521'}/index.html`);
    const timing=await page.evaluate(()=>new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Arrival did not complete')),15000);
      let last,first;const intervals=[],handoff=[];
      function measure(now) {
        const gate=document.querySelector('#cosmic-arrival');
        if(gate.dataset.state==='playing') {
          first??=now;
          if(last!==undefined) {
            const delta=now-last;intervals.push(delta);
            const p=Number(gate.dataset.progress);
            if(p>=.22&&p<=.4)handoff.push(delta);
          }
          last=now;
        } else if(first!==undefined&&!gate.open) {
          clearTimeout(timeout);resolve({elapsed:now-first,intervals,handoff});return;
        }
        requestAnimationFrame(measure);
      }
      requestAnimationFrame(measure);
    }));
    assert(timing.handoff.length>5,'Handoff must have multiple animated frames');
    assert(Math.max(...timing.handoff)<250,'No quarter-second stall during the galaxy/Sun handoff');
    assert(timing.elapsed<(width<700?4800:6900)+1000,'Playback duration is unchanged');
    const sorted=timing.intervals.toSorted((a,b)=>a-b);
    console.log(`${width}px: duration ${Math.round(timing.elapsed)}ms; p95 frame ${sorted[Math.floor(sorted.length*.95)].toFixed(1)}ms; maximum handoff gap ${Math.max(...timing.handoff).toFixed(1)}ms`);
    await page.close();
  }
} finally {await browser.close();}
