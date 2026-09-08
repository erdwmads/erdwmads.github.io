import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52521';
try {
  for(const width of [1440,390,320]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
    await page.goto(`${base}/research.html#observe=1&view=origins&material=ryugu&originProgress=.28&originCutaway=1`);
    const root=page.locator('[data-planetary-explorer]'),stage=root.locator('[data-stage]'),canvas=root.locator('canvas');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
    const timeline=root.locator('[data-origin-progress]');
    async function set(p) {await timeline.fill(String(p));await timeline.dispatchEvent('input');await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(120);}
    const frames=[];
    for(const p of [.28,.35,.4,.48,.52,.575,.61,.65,.72]) {
      await set(p);
      const frame=await canvas.screenshot({path:`.codex_tmp/contact-${width}-${p}.png`});frames.push(frame.toString('base64'));
      const {data,info}=await sharp(frame).removeAlpha().raw().toBuffer({resolveWithObject:true});let changed=0,left=info.width,right=0,top=info.height,bottom=0;
      for(let y=1;y<info.height-1;y++)for(let x=1;x<info.width-1;x++) {
        const i=(y*info.width+x)*3;
        if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>45){changed++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      assert(changed>info.width*info.height*.008,`${width}/${p}: model must be nonblank`);
      assert(left>2&&top>2&&right<info.width-3&&bottom<info.height-3,`${width}/${p}: assembly and altered body must fit the frame`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    assert.equal(new Set(frames).size,frames.length,'All assembly and alteration milestones render differently');
    await set(.52);assert.equal(await root.locator('[data-origin-inspect]').isDisabled(),true);
    await set(.72);assert.equal(await root.locator('[data-origin-inspect]').isDisabled(),false);
    await root.locator('[data-origin-inspect]').click();await page.waitForTimeout(500);
    assert.equal(await root.getAttribute('data-origin-focus'),'carbonate');
    await root.locator('[data-origin-inspect]').click();await page.waitForTimeout(500);
    await set(.4);const earlier=await canvas.screenshot();await set(.72);await set(.4);
    assert.deepEqual(await canvas.screenshot(),earlier,'Scrubbing backwards restores exactly the same model');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}})));
    await root.locator('[data-origin-play]').click();const before=Number(await root.getAttribute('data-origin-progress'));
    const intervals=await page.evaluate(()=>new Promise(resolve=>{
      const samples=[];let previous=0,start=0;
      function frame(now){if(previous)samples.push(now-previous);else start=now;previous=now;if(now-start>=1200)resolve(samples);else requestAnimationFrame(frame);}
      requestAnimationFrame(frame);
    }));
    assert(Number(await root.getAttribute('data-origin-progress'))>before);
    intervals.sort((a,b)=>a-b);const p95=intervals[Math.floor(intervals.length*.95)];
    assert(p95<100,`${width}: warmed playback has sustained frame stalls (${p95.toFixed(1)}ms p95)`);
    console.log(`Playback ${width}px: p95 frame interval ${p95.toFixed(1)}ms (${intervals.length} sampled frames)`);
    await root.locator('[data-origin-play]').click();
    await root.locator('[data-action="zoom-in"]').click();assert(Number(await root.getAttribute('data-zoom'))>1);
    await root.locator('[data-action="reset"]').click();
    for(const theme of ['light','space']) {
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await set(.61);await root.locator('.planetary-layout').screenshot({path:`.codex_tmp/contact-layout-${width}-${theme}.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS ${width}px: assembly, melting, fluid, alteration pixels; reversible scrubbing; playback; camera; themes; no shader errors`);
  }
} finally {await browser.close();}
