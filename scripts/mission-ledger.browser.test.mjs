// Mission Index ledger (spec §4.11, §5 row 31, §6.5), with a synthetic encrypted archive only: below 1200 px a closed
// disclosure "Mission Index · N records" with 48 px rows; from 1200 px open, sticky beside the entry and scrolling
// inside itself, the current row in view with aria-current and the brass rule. The list stays a labelled region that
// is not live, and unlock still lands focus on the session notice. Crossing 1200 px re-syncs the disclosure.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const password='synthetic ledger fixture';
const count=14;
const entries=Array.from({length:count},(_,i)=>{const n=i+1,id=String(n).padStart(3,'0');return {id:'log-'+id,number:n,sol:n*3,label:'LOG '+id,date:'2026/'+String(4+Math.floor(i/4)).padStart(2,'0')+'/'+String(10+i).padStart(2,'0'),latestNote:'Synthetic note '+n,bodyHtml:'<p class="mission-entry-kicker">LOG '+id+'</p><h3>Synthetic record '+n+'</h3>'+'<p>Layout fixture only: a long record, so the entry runs well past the ledger and the ledger has to stay in place.</p>'.repeat(24)};});
const salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(password,salt,600000,32,'sha256'),iv);
const payload={version:1,kdf:'PBKDF2-SHA-256',iterations:600000,cipher:'AES-256-GCM',salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:Buffer.concat([cipher.update(JSON.stringify(entries)),cipher.final(),cipher.getAuthTag()]).toString('base64')};
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const errors=[];
async function unlocked(width,theme,height=900){
  const phone=width<=760;
  const context=await browser.newContext({viewport:{width,height:phone?844:height},isMobile:phone,hasTouch:phone,reducedMotion:'reduce'});
  await context.addInitScript(t=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',t);},theme);
  await context.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/research-graduation.html');
  await page.locator('[data-research-lock-input]').fill(password);
  await page.locator('[data-research-lock-form] button[type="submit"]').click();
  await page.locator('.mission-record-header').waitFor();
  return {context,page};
}
const state=page=>page.evaluate(()=>{
  const ledger=document.querySelector('.mission-ledger'),list=document.querySelector('[data-mission-index-list]'),summary=ledger.querySelector('summary');
  const rows=[...list.querySelectorAll('.mission-jump-card')],current=rows.filter(row=>row.getAttribute('aria-current')==='true');
  const r=el=>el.getBoundingClientRect();
  const accent=(()=>{const probe=document.createElement('i');document.body.append(probe);probe.style.color='var(--obs-accent)';const value=getComputedStyle(probe).color;probe.remove();return value;})();
  return {open:ledger.open,summaryShown:summary.checkVisibility(),summaryHeight:r(summary).height,summaryText:summary.innerText.replace(/\s+/g,' ').trim(),
    position:getComputedStyle(document.querySelector('.mission-index-section')).position,sectionTop:r(document.querySelector('.mission-index-section')).top,headerBottom:r(document.querySelector('.site-header')).bottom,
    listScrolls:list.scrollHeight>list.clientHeight+1,listTop:r(list).top,listBottom:r(list).bottom,rowHeights:rows.map(row=>r(row).height),rowsShown:rows.filter(row=>row.checkVisibility()).length,
    current:current.length,currentId:current[0]?.dataset.missionTarget,currentTop:current[0]&&r(current[0]).top,currentBottom:current[0]&&r(current[0]).bottom,currentRule:current[0]&&getComputedStyle(current[0]).borderLeftColor,currentRuleWidth:current[0]&&getComputedStyle(current[0]).borderLeftWidth,accent,
    region:[list.getAttribute('role'),list.getAttribute('aria-label'),list.getAttribute('tabindex'),list.getAttribute('aria-live')].join('|'),
    noticeFocused:document.activeElement?.matches('[data-research-session-notice]'),overflow:document.documentElement.scrollWidth>innerWidth+1,
    entryLeft:r(document.querySelector('.mission-log-entry')).left,ledgerRight:r(document.querySelector('.mission-index-section')).right};
});
try{
  for(const theme of ['space','light']){
    for(const width of [1440,1200]){
      const {context,page}=await unlocked(width,theme);
      let s=await state(page);
      const label=`${theme} ${width}`;
      assert.equal(s.noticeFocused,true,label+': unlock must focus the session notice');
      assert.equal(s.region,'region|Experiment timeline|0|',label+': the list stays a labelled region, not live');
      assert.equal(s.open,true,label+': the ledger is open at 1200 px and wider');
      assert.equal(s.summaryShown,false,label+': the summary is hidden beside the entry');
      assert.equal(s.position,'sticky',label);
      assert(s.ledgerRight<=s.entryLeft,label+': the ledger is a column beside the entry');
      assert.equal(s.rowsShown,count);
      assert(s.rowHeights.every(h=>h>=47.5),label+': rows under 48 px '+JSON.stringify(s.rowHeights));
      assert(s.listScrolls,label+': with '+count+' records the list scrolls inside the ledger');
      // The newest record opens first and its row is scrolled into view inside the list.
      assert.equal(s.current,1);assert.equal(s.currentId,'log-'+String(count).padStart(3,'0'));
      assert(s.currentTop>=s.listTop-1&&s.currentBottom<=s.listBottom+1,label+': the current row is outside the list viewport');
      assert.equal(s.currentRule,s.accent,label+': the current row carries the brass rule');
      assert.equal(s.currentRuleWidth,'2px');
      assert.equal(s.overflow,false);
      // Sticky: after a long scroll the ledger still sits 24 px under the floating header and inside the viewport.
      await page.evaluate(()=>scrollTo(0,document.querySelector('.mission-log-entry').getBoundingClientRect().top+scrollY+400));
      s=await state(page);
      assert(Math.abs(s.sectionTop-(s.headerBottom+24))<=2,label+': the ledger is not sticky 24 px under the header ('+s.sectionTop+', header '+s.headerBottom+')');
      assert(s.listBottom<=900+1,label+': the ledger runs past the viewport');
      // Choosing a row moves the brass rule and aria-current; the page scrolls to the entry, not the list's row.
      await page.locator('[data-mission-target="log-002"]').click();
      await page.waitForFunction(()=>document.querySelector('.mission-log-entry')?.id==='log-002');
      s=await state(page);
      assert.equal(s.currentId,'log-002');assert.equal(s.current,1);
      assert(s.currentTop>=s.listTop-1&&s.currentBottom<=s.listBottom+1,label+': the chosen row left the list viewport');
      await context.close();
      console.log(`PASS ${label}: open, sticky, scrolling ledger with the current row in view`);
    }
    for(const width of [1199,1024,390]){
      const {context,page}=await unlocked(width,theme);
      const label=`${theme} ${width}`;
      let s=await state(page);
      assert.equal(s.noticeFocused,true,label+': unlock must focus the session notice');
      assert.equal(s.region,'region|Experiment timeline|0|',label);
      assert.equal(s.open,false,label+': the ledger starts closed below 1200 px');
      assert.equal(s.summaryShown,true);
      assert(s.summaryHeight>=47.5,label+': the summary is under 48 px');
      assert.match(s.summaryText,new RegExp('^Mission Index · '+count+' records'),label);
      assert.equal(s.rowsShown,0,label+': rows show while closed');
      assert.notEqual(s.position,'sticky',label);
      await page.locator('.mission-ledger__summary').click();
      s=await state(page);
      assert.equal(s.open,true);assert.equal(s.rowsShown,count);
      assert(s.rowHeights.every(h=>h>=47.5),label+': rows under 48 px');
      assert.equal(s.listScrolls,false,label+': the open list flows with the page');
      assert.equal(s.overflow,false);
      if(width===1024){
        // Crossing the breakpoint re-syncs the disclosure: open when wide, closed again when narrow.
        await page.setViewportSize({width:1440,height:900});
        await page.waitForFunction(()=>document.querySelector('.mission-ledger').open);
        await page.setViewportSize({width:1024,height:900});
        await page.waitForFunction(()=>!document.querySelector('.mission-ledger').open);
      }
      await context.close();
      console.log(`PASS ${label}: closed disclosure named with its count, 48 px rows, flows with the page`);
    }
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
