import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.goto(base+'/research.html');await page.waitForFunction(()=>window.__madsLegacyNavigationReady);
 let release,ready;const gate=new Promise(r=>release=r),intercepted=new Promise(r=>ready=r);
 await page.route('**/contact.html',async route=>{ready();await gate;await route.continue();});
 await page.locator('.nav a[href="contact.html"]').click();await intercepted;
 await page.locator('.nav a[href="research.html"]').click();release();await page.waitForTimeout(600);
 assert.ok(page.url().endsWith('/research.html'),'current-page activation must cancel pending departure');
 assert.equal(await page.title(),'Research | Mads LIU Yong');
 assert.equal(await page.locator('main').getAttribute('aria-busy'),null);
 await page.unroute('**/contact.html');
 await page.goto(base+'/index.html');await page.waitForFunction(()=>window.__madsLegacyNavigationReady);
 await page.evaluate(()=>{const a=document.createElement('a');a.href='ryugu-bennu.html#missions-title';a.textContent='test destination';a.id='nav-regression-anchor';document.querySelector('main').prepend(a);});
 await page.locator('#nav-regression-anchor').click();await page.waitForURL('**/ryugu-bennu.html#missions-title');
 await page.waitForFunction(()=>!document.documentElement.classList.contains('mads-soft-nav-active'));
 const y=await page.evaluate(()=>scrollY);assert.ok(y>100);
 await page.goBack();await page.waitForURL('**/index.html');await page.waitForFunction(()=>!document.documentElement.classList.contains('mads-soft-nav-active'));
 await page.goForward();await page.waitForURL('**/ryugu-bennu.html#missions-title');await page.waitForFunction(()=>!document.documentElement.classList.contains('mads-soft-nav-active'));
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<4,'Forward restores initial anchor position');
 await page.locator('.nav a[href="ryugu-bennu.html"]').click();assert.equal(new URL(page.url()).hash,'');
 console.log('Navigation intent and anchor history: passed');
} finally {await browser.close();}
