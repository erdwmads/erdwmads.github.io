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
      let last,first,preparing;const intervals=[],handoff=[];
      function measure(now) {
        const gate=document.querySelector('#cosmic-arrival');
        if(first===undefined&&!gate.open&&gate.dataset.state==='complete') {
          clearTimeout(timeout);reject(new Error('Arrival closed before playing: preparing exceeded the 3 s cap'));return;
        }
        if(gate.dataset.state==='playing') {
          if(first===undefined)preparing=performance.now()-window.cosmicArrivalOpened;
          first??=now;
          if(last!==undefined) {
            const delta=now-last;intervals.push(delta);
            const p=Number(gate.dataset.progress);
            if(p>=.22&&p<=.4)handoff.push(delta);
          }
          last=now;
        } else if(first!==undefined&&!gate.open) {
          clearTimeout(timeout);resolve({elapsed:now-first,preparing,intervals,handoff});return;
        }
        requestAnimationFrame(measure);
      }
      requestAnimationFrame(measure);
    }));
    assert(timing.handoff.length>5,'Handoff must have multiple animated frames');
    assert(Math.max(...timing.handoff)<250,'No quarter-second stall during the galaxy/Sun handoff');
    assert(timing.elapsed<(width<700?4000:5600)+1000,'Playback stays within its shortened duration');
    // Viewport-sized WebP derivatives only; the 4096 JPEG originals stay for the sample-missions close-up.
    const size=width<700?1024:2048;
    const maps=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>new URL(entry.name).pathname).filter(path=>/\/assets\/img\/arrival\/earth-(day|night)/.test(path)));
    assert.deepEqual(maps.toSorted(),[`/assets/img/arrival/earth-day-${size}.webp`,`/assets/img/arrival/earth-night-${size}.webp`],`${width}px loads the ${size} Earth maps`);
    const sorted=timing.intervals.toSorted((a,b)=>a-b);
    console.log(`${width}px: preparing ${Math.round(timing.preparing)}ms; duration ${Math.round(timing.elapsed)}ms; p95 frame ${sorted[Math.floor(sorted.length*.95)].toFixed(1)}ms; maximum handoff gap ${Math.max(...timing.handoff).toFixed(1)}ms`);
    await page.close();
  }
} finally {await browser.close();}
