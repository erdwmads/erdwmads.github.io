import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const bundle=await build({stdin:{contents:`
  import * as T from 'three';import {createPresentation} from './src/scripts/sample-missions/presentation.js';
  const r=new T.WebGLRenderer({preserveDrawingBuffer:true});r.setSize(320,180);r.toneMapping=T.ACESFilmicToneMapping;document.body.append(r.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(),p=createPresentation(r,scene,camera);p.resize(320,180);p.glow(false);
  const pixel=()=>{const b=new Uint8Array(4);r.getContext().readPixels(160,90,1,1,r.getContext().RGBA,r.getContext().UNSIGNED_BYTE,b);return [...b];};
  window.checkTransition=()=>{
   scene.background=new T.Color('#ec5426');p.render(performance.now());
   p.capture();scene.background.set('#24b65c');p.render(performance.now()+180);const before=pixel();
   p.capture();scene.background.set('#326cf3');p.render(performance.now());const after=pixel();
   p.render(performance.now()+700);const end=pixel();p.dispose();r.dispose();return {before,after,end};
  };
 `,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',logLevel:'silent'});
 const harness=await browser.newPage();
 await harness.route('**/__mission-transition-test',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
 await harness.goto(base+'/__mission-transition-test');await harness.addScriptTag({content:bundle.outputFiles[0].text});
 const pixels=await harness.evaluate(()=>checkTransition());
 console.log('Rapid transition pixels',pixels);
 assert(pixels.before.slice(0,3).every((v,i)=>Math.abs(v-pixels.after[i])<=3),'a second transition starts from the currently displayed blend');
 assert(pixels.end[2]>pixels.end[0],'transition reaches the new frame');await harness.close();
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(base+'/research.html',{waitUntil:'networkidle'});
 const v=page.locator('[data-mission-viewport]');await v.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true');
 await page.evaluate(()=>sampleMissions.select(3,.5));await page.waitForTimeout(900);
 const b=await v.boundingBox(),beforeScroll=await page.evaluate(()=>scrollY);
 await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.wheel(0,350);await page.waitForTimeout(200);
 assert((await page.evaluate(()=>scrollY))>beforeScroll+100,'ordinary wheel scroll passes through the model to the page');
 await v.scrollIntoViewIfNeeded();await v.focus();await page.keyboard.press('Space');assert(await page.evaluate(()=>sampleMissions.state.playing));await page.keyboard.press('Space');
 const rect=await v.boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.8);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.05,{steps:16});await page.mouse.up();await page.waitForTimeout(700);
 assert((await page.evaluate(()=>sampleMissions.state.camera.position[1]))>=0,'orbiting a surface scene keeps the camera above ground');
 await page.locator('[data-mission-progress]').fill('500');assert.match(await page.locator('[data-mission-progress]').getAttribute('aria-valuetext'),/50%.*Projectile sampling/);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobile.goto(base+'/research.html',{waitUntil:'networkidle'});const mv=mobile.locator('[data-mission-viewport]');await mv.scrollIntoViewIfNeeded();await mobile.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true');
 const explore=mobile.locator('[data-mission-action="touch"]');assert.match(await explore.innerText(),/Explore/);assert.match(await mobile.locator('[data-mission-hint]').innerText(),/Explore/);
 await explore.click();assert.match(await explore.innerText(),/Done/);assert.match(await mobile.locator('[data-mission-hint]').innerText(),/pinch/);
 await mv.press('Escape');assert.match(await explore.innerText(),/Explore/);
 await mv.scrollIntoViewIfNeeded();await mobile.screenshot({path:process.env.TEMP+'/mission-refined-mobile.png'});
 console.log('PASS interrupted HDR dissolve, page scroll, keyboard playback, surface camera boundary, accessible progress and explicit touch mode');
}finally{await browser.close();}
