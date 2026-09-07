import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {encodeObservation} from '../src/scripts/planetary-view-link.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
  const readings=[];
  for(const [i,position] of [[2.1,1.15,4],[-2,-1,-4],[4,.2,0],[-4,.2,0],[0,4,1],[0,-4,1]].entries()) {
    await page.goto(encodeObservation({view:'origins',material:'orgueil',originProgress:.65,originCutaway:0,camera:{position,target:[0,0,0],up:[0,1,0],zoom:1}},`${base}/research.html`),{waitUntil:'networkidle'});
    const canvas=page.locator('.planetary canvas');await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
    const buffer=await canvas.screenshot({path:`.codex_tmp/origins-light-angle-${i}.png`});
    const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let total=0,count=0;
    for(let y=Math.floor(info.height*.44);y<info.height*.56;y++)for(let x=Math.floor(info.width*.44);x<info.width*.56;x++) {
      const at=(y*info.width+x)*3;total+=data[at]*.2126+data[at+1]*.7152+data[at+2]*.0722;count++;
    }
    readings.push(total/count);
  }
  console.log('Central rock luminance by angle:',readings.map(n=>n.toFixed(1)));
  assert.ok(Math.min(...readings)>=42,'Inspection must retain legible surface detail on the side facing away from the key light');
} finally {await browser.close();}
