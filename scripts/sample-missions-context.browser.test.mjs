import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html',{waitUntil:'networkidle'});
 const view=page.locator('[data-mission-viewport]'),canvas=view.locator('canvas');
 await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:45000});await ready();
 assert.equal(await canvas.evaluate(e=>getComputedStyle(e).touchAction),'pan-y','initial canvas permits page touch scrolling');
 const b=await view.boundingBox(),before=await page.evaluate(()=>scrollY),cdp=await page.context().newCDPSession(page);
 const x=b.x+b.width*.5,y=Math.min(b.y+b.height*.75,700);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*20}]});await page.waitForTimeout(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
 assert((await page.evaluate(()=>scrollY))>before+40,'initial swipe on canvas scrolls the page');
 await view.scrollIntoViewIfNeeded();
 await page.locator('[data-mission-action="touch"]').click();await page.locator('[data-mission-action="play"]').click();
 await canvas.evaluate(e=>e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='error');
 await page.locator('[data-mission-action="retry"]').click();await ready();
 assert.equal(await page.evaluate(()=>sampleMissions.state.playing),false);
 assert.equal(await page.locator('[data-mission-action="play"]').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('[data-mission-touch-label]').innerText(),'Explore');
 assert.equal(await canvas.evaluate(e=>getComputedStyle(e).touchAction),'pan-y');
 await page.locator('[data-mission-action="play"]').click();assert(await page.evaluate(()=>sampleMissions.state.playing));
 console.log('PASS initial mobile swipe, graphics-context retry and restored playback/touch controls');
}finally{await browser.close();}
