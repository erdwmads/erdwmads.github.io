import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
const password='passkey browser test only';
const entries=[{id:'log-001',date:'2026-09-14',label:'Synthetic test record',title:'Synthetic test',bodyHtml:'<p data-test-private>Only a synthetic archive is used in this test.</p>'}];
function archive() {
 const salt=randomBytes(16),iv=randomBytes(12),key=pbkdf2Sync(password,salt,600000,32,'sha256'),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(entries),'utf8'),cipher.final(),cipher.getAuthTag()]);
 return {version:1,kdf:'PBKDF2-SHA-256',cipher:'AES-256-GCM',iterations:600000,salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:encrypted.toString('base64')};
}
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const results=[],errors=[];
const evidence=join(tmpdir(),'research-passkey-review');await mkdir(evidence,{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 let payload=archive();
 await context.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
 await context.addInitScript(()=>{
   sessionStorage.setItem('mads-cosmic-arrival-v1','done');
   window.__passkeyCalls=0;
   const encode=value=>new TextEncoder().encode(value);
   const base64=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
   Object.defineProperty(window,'PublicKeyCredential',{configurable:true,value:{isUserVerifyingPlatformAuthenticatorAvailable:async()=>localStorage.getItem('fixture-mode')!=='unavailable'}});
   async function reply(options,creation) {
     window.__passkeyCalls++;
     const mode=localStorage.getItem('fixture-mode');
     if(mode==='cancel') throw new DOMException('User cancelled','NotAllowedError');
     const pk=options.publicKey,auth=new Uint8Array(37);
     auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',encode(pk.rp?.id||pk.rpId))));auth[32]=5;
     if(mode==='bad-create-uv'&&creation) auth[32]=1;
     if(mode==='bad-get-rp'&&!creation) auth[0]^=1;
     return {type:'public-key',rawId:new Uint8Array([11,22,33,44]).buffer,
       response:{clientDataJSON:encode(JSON.stringify({type:creation?'webauthn.create':'webauthn.get',origin:location.origin,challenge:base64(pk.challenge),crossOrigin:false})).buffer,authenticatorData:auth.buffer,getAuthenticatorData:()=>auth.buffer},
       getClientExtensionResults:()=>({prf:mode==='no-prf'?{enabled:false}:{enabled:true,results:{first:new Uint8Array(32).fill(87).buffer}}})};
   }
   Object.defineProperty(navigator,'credentials',{configurable:true,value:{create:o=>reply(o,true),get:o=>reply(o,false)}});
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 const go=()=>page.goto(base+'/research-graduation.html?preview=passkey#archive-access');
 const input=page.locator('[data-research-lock-input]'),setup=page.locator('[data-passkey-setup]'),unlock=page.locator('[data-passkey-unlock]'),content=page.locator('[data-research-lock-content]'),gate=page.locator('[data-research-lock-gate]');
 await go();await setup.waitFor({state:'visible'});
 await input.fill('incorrect');await setup.click();
 await page.getByText('Incorrect password.',{exact:true}).waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>window.__passkeyCalls),0);
 results.push('Wrong password does not create a passkey');
 await input.fill(password);await setup.click();await content.waitFor({state:'visible'});
 const stored=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('mads-research-passkey-v1:')));
 assert.equal(stored.length,1);assert.equal(stored[0][1].includes(password),false);
 results.push('Enrollment verifies password, saves ciphertext and opens synthetic archive');
 await page.getByRole('button',{name:'Lock log',exact:true}).click();await gate.waitFor({state:'visible'});
 assert.equal(await page.locator('[data-test-private]').count(),0);
 assert.equal(await page.evaluate(()=>window.MadsProtectedArchive),undefined);
 await page.reload();await unlock.waitFor({state:'visible'});await unlock.click();await content.waitFor({state:'visible'});
 results.push('Reloaded page unlocks with passkey and no password input');
 payload=archive();
 await page.getByRole('button',{name:'Lock log',exact:true}).click();await unlock.click();await content.waitFor({state:'visible'});
 results.push('Fresh archive salt does not break the existing passkey shortcut');
 await page.getByRole('link',{name:'Research',exact:true}).first().click();await page.waitForURL(/research\.html/);
 assert.equal(await page.evaluate(()=>window.MadsProtectedArchive),undefined);
 await go();await unlock.waitFor({state:'visible'});
 await page.evaluate(()=>localStorage.setItem('fixture-mode','cancel'));await unlock.click();
 await page.getByText(/verification was cancelled or timed out/).waitFor({state:'visible'});
 assert.equal(await content.isVisible(),false);
 await input.fill(password);await page.getByRole('button',{name:'Unlock with password',exact:true}).click();await content.waitFor({state:'visible'});
 results.push('Soft navigation relocks; cancelled passkey keeps password fallback working');
 await page.getByRole('button',{name:'Lock log',exact:true}).click();
 await page.getByRole('button',{name:'Forget this browser',exact:true}).click();
 assert.equal(await unlock.isVisible(),false);
 await page.evaluate(()=>localStorage.setItem('fixture-mode','no-prf'));await input.fill(password);await setup.click();
 await page.getByText(/does not support PRF/).waitFor({state:'visible'});
 assert.equal(await content.isVisible(),false);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('mads-research-passkey-v1:')).length),0);
 results.push('No PRF means no saved shortcut and no false unlock');
 for(const [mode,code] of [['bad-create-uv','PK-CREATE-UV'],['bad-get-rp','PK-GET-RP-HASH']]) {
   await page.evaluate(mode=>localStorage.setItem('fixture-mode',mode),mode);
   await input.fill(password);await setup.click();
   await page.getByText('The passkey could not be verified. Use your password. ['+code+']',{exact:true}).waitFor({state:'visible'});
   assert.equal(await content.isVisible(),false);
   assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('mads-research-passkey-v1:')).length),0);
   assert.equal(await page.getByRole('button',{name:'Unlock with password',exact:true}).isEnabled(),true);
 }
 results.push('Creation and assertion failures display precise safe codes, keep the archive locked and never save a broken link');

 await page.evaluate(()=>localStorage.removeItem('fixture-mode'));await page.reload();await setup.waitFor({state:'visible'});
 for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});
   for(const theme of ['space','light']) {
     await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.toggleAttribute('data-theme-space',theme==='space');},theme);
     await gate.scrollIntoViewIfNeeded();
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
     for(const selector of ['[data-passkey-setup]','[data-research-lock-form] button[type=submit]']) {
       const r=await page.locator(selector).boundingBox();assert.ok(r.height>=44);assert.ok(r.x>=0&&r.x+r.width<=width+1);
     }
     await page.screenshot({path:join(evidence,'gate-'+width+'-'+theme+'.png')});
   }
 }
 results.push('Desktop/mobile, both themes: no overflow and accessible action sizes');
 await page.evaluate(()=>localStorage.setItem('fixture-mode','unavailable'));await page.reload();
 await page.getByText(/Passkey setup is unavailable here/).waitFor({state:'visible'});
 assert.equal(await setup.isVisible(),false);
 await input.fill(password);await page.getByRole('button',{name:'Unlock with password',exact:true}).click();await content.waitFor({state:'visible'});
 results.push('Unsupported platform retains a complete password unlock flow');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:results.length,results,evidence,scriptErrors:errors},null,2));
} finally {await browser.close();}
