import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://localhost:52523';
const password='synthetic virtual-authenticator test';
const salt=randomBytes(16),iv=randomBytes(12);
const cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(password,salt,600000,32,'sha256'),iv);
const entries=[{id:'log-001',date:'2026-09-14',label:'Synthetic record',title:'Synthetic record',bodyHtml:'<p>Virtual authenticator test only.</p>'}];
const encrypted=Buffer.concat([cipher.update(JSON.stringify(entries)),cipher.final(),cipher.getAuthTag()]);
const payload={version:1,kdf:'PBKDF2-SHA-256',cipher:'AES-256-GCM',iterations:600000,salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:encrypted.toString('base64')};
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try {
  for(const hasPrf of [true,false]) {
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{
      protocol:'ctap2',ctap2Version:'ctap2_1',transport:'internal',
      hasResidentKey:true,hasUserVerification:true,isUserVerified:true,
      automaticPresenceSimulation:true,hasPrf
    }});
    let assertions=0;
    cdp.on('WebAuthn.credentialAsserted',()=>assertions++);
    await page.goto(base+'/research-graduation.html#archive-access');
    await page.locator('[data-passkey-setup]').waitFor({state:'visible'});
    await page.locator('[data-research-lock-input]').fill(password);
    await page.locator('[data-passkey-setup]').click();
    if(hasPrf) {
      try { await page.locator('[data-research-lock-content]').waitFor({state:'visible',timeout:12000}); }
      catch(error) { throw new Error('Native WebAuthn flow: '+await page.locator('[data-research-lock-error]').textContent()); }
      assert.equal(assertions,2,'Setup must use and verify the assertion key');
      await page.getByRole('button',{name:'Lock log',exact:true}).click();
      await page.reload();
      await page.locator('[data-passkey-unlock]').click();
      await page.locator('[data-research-lock-content]').waitFor({state:'visible'});
      assert.equal(assertions,3,'A reload unlocks through the native WebAuthn API');
      assert.equal(await page.locator('[data-research-lock-input]').inputValue(),'');
    } else {
      await page.getByText(/does not support PRF/).waitFor({state:'visible'});
      assert.equal(await page.locator('[data-research-lock-content]').isVisible(),false);
      assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('mads-research-passkey-v1:')).length),0);
    }
    await context.close();
  }
  console.log('Native Chromium WebAuthn + virtual CTAP2: verified setup, reload/unlock and unsupported-PRF rejection passed. Windows Hello hardware remains a separate manual check.');
} finally { await browser.close(); }
