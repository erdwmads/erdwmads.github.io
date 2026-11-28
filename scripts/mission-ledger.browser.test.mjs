// Mission Index ledger (spec §4.11, §5 row 31, §6.5), with a synthetic encrypted archive only: below 1200 px a closed
// disclosure "Mission Index · N records" with 48 px rows; from 1200 px open, sticky beside the entry and scrolling
// inside itself, the current row in view with aria-current and the brass rule. The list stays a labelled region that
// is not live, and unlock still lands focus on the session notice. Crossing 1200 px re-syncs the disclosure.
// Every record has a long title (60 to 90 characters, as real ones can be; one runs to 404, so it wraps past two lines at every width): each row grows with its
// title, so no two rows' text boxes overlap, no text spills out of its row, the label and the date share a baseline, and
// at rest the list's top fade does not cover the first row (owner, 2026-11-28: overlapping rows in the sticky ledger at
// 1440 px). Each title shows two lines at most, with an ellipsis (owner, 2026-11-28): the whole title stays in the DOM
// text and in the title's tooltip, and no row changes height on hover, on focus or when the current row moves. Rows keep
// their DOM order, the keyboard order, with no tabindex.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const password='synthetic ledger fixture';
const count=14;
const longTitle=n=>('Synthetic record '+n+': a layout fixture with a long working title that wraps across several lines of the ledger').slice(0,60+(n*11)%31).trim();
const titleOf=n=>n===7?[7,8,9,10,11].map(longTitle).join(' — '):longTitle(n);
const entries=Array.from({length:count},(_,i)=>{const n=i+1,id=String(n).padStart(3,'0');return {id:'log-'+id,number:n,sol:n%4?n*3:undefined,label:'LOG '+id,title:titleOf(n),date:'2026/'+String(4+Math.floor(i/4)).padStart(2,'0')+'/'+String(10+i).padStart(2,'0'),latestNote:'Synthetic note '+n,bodyHtml:'<p class="mission-entry-kicker">LOG '+id+'</p><h3>Synthetic record '+n+'</h3>'+'<p>Layout fixture only: a long record, so the entry runs well past the ledger and the ledger has to stay in place.</p>'.repeat(24)};});
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
  // The painted text boxes (line boxes) of each shown row's label, date and title: none may overlap another row's, or leave
  // its own row; the label's and the date's baselines, probed with an empty inline-block, must match. A clamped title's
  // lines past the second are laid out but clipped by its own box, so each line box is cut to that box and an unpainted
  // one is dropped.
  const rowText=rows=>{
    const boxes=rows.flatMap((row,i)=>[...row.querySelectorAll('.mission-jump-sol,.mission-jump-date,.mission-jump-title')].filter(el=>el.checkVisibility()).flatMap(el=>{
      const clip=getComputedStyle(el).overflow==='visible'?null:el.getBoundingClientRect();
      const cut=b=>clip?{left:Math.max(b.left,clip.left),right:Math.min(b.right,clip.right),top:Math.max(b.top,clip.top),bottom:Math.min(b.bottom,clip.bottom)}:b;
      const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()].map(cut).filter(b=>b.right-b.left>.5&&b.bottom-b.top>.5).map(b=>({row:i,b}));}));
    let overlaps=0;
    for(let a=0;a<boxes.length;a++)for(let c=a+1;c<boxes.length;c++){const p=boxes[a],q=boxes[c];
      if(p.row!==q.row&&Math.min(p.b.right,q.b.right)-Math.max(p.b.left,q.b.left)>.5&&Math.min(p.b.bottom,q.b.bottom)-Math.max(p.b.top,q.b.top)>.5)overlaps++;}
    const spill=boxes.filter(({row,b})=>{const box=rows[row].getBoundingClientRect();return b.top<box.top-.5||b.bottom>box.bottom+.5;}).length;
    const baseline=el=>{const probe=document.createElement('span');probe.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';el.prepend(probe);const y=probe.getBoundingClientRect().top;probe.remove();return y;};
    const baselineGap=Math.max(0,...rows.filter(row=>row.checkVisibility()).map(row=>Math.abs(baseline(row.querySelector('.mission-jump-sol'))-baseline(row.querySelector('.mission-jump-date')))));
    // Each shown title: its line count (box height over line height), whether the clamp cut it, its DOM text and tooltip.
    const titles=rows.filter(row=>row.checkVisibility()).map(row=>{const t=row.querySelector('.mission-jump-title'),cs=getComputedStyle(t);
      return {id:row.dataset.missionTarget,text:t.textContent,tip:t.getAttribute('title'),lines:t.getBoundingClientRect().height/parseFloat(cs.lineHeight),clamped:t.scrollHeight>t.clientHeight+1,clamp:cs.webkitLineClamp};});
    return {textBoxes:boxes.length,overlaps,spill,baselineGap,titles};
  };
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
    entryLeft:r(document.querySelector('.mission-log-entry')).left,ledgerRight:r(document.querySelector('.mission-index-section')).right,
    order:rows.map(row=>row.dataset.missionTarget).join(','),tabindex:rows.some(row=>row.hasAttribute('tabindex')),fadeContent:getComputedStyle(list,'::before').content,...rowText(rows)};
});
const assertRowsReadable=(s,label)=>{
  assert(s.textBoxes>count*2,label+': no row text was measured');
  assert.equal(s.overlaps,0,label+': text of neighbouring rows overlaps');
  assert.equal(s.spill,0,label+': text spills out of its row');
  assert(s.baselineGap<=.5,label+': the label and the date do not share a baseline ('+s.baselineGap+' px)');
  assert.equal(s.titles.length,count,label+': not every title was measured');
  for(const t of s.titles){
    const full=titleOf(Number(t.id.slice(4)));
    assert(t.lines<=2.05,label+': '+t.id+' shows '+t.lines.toFixed(2)+' lines, at most two');
    assert.equal(t.clamp,'2',label+': '+t.id+' is not clamped to two lines');
    assert.equal(t.text,full,label+': '+t.id+' lost part of its title in the DOM');
    assert.equal(t.tip,full,label+': '+t.id+' has no tooltip with the whole title');
  }
  // The longest title is cut at every width, so the clamp is proven, not idle.
  assert(s.titles.find(t=>t.id==='log-007').clamped,label+': the 404-character title was not clamped');
  assert.equal(s.order,entries.map(e=>e.id).join(','),label+': rows left their order');
  assert.equal(s.tabindex,false,label+': a row carries a tabindex');
};
// Hover and keyboard focus never change a row's height (no reflow while reading).
const steadyRows=async(page,label)=>{
  const heights=()=>page.evaluate(()=>[...document.querySelectorAll('[data-mission-index-list] .mission-jump-card')].map(row=>row.getBoundingClientRect().height));
  const rest=await heights();
  await page.locator('[data-mission-target="log-007"]').hover();
  assert.deepEqual(await heights(),rest,label+': hovering a row changed row heights');
  await page.locator('[data-mission-target="log-005"]').focus();
  assert.deepEqual(await heights(),rest,label+': focusing a row changed row heights');
  return rest;
};
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
      assertRowsReadable(s,label);
      const rest=await steadyRows(page,label);
      console.log(`${label}: rows ${Math.min(...s.rowHeights).toFixed(1)} to ${Math.max(...s.rowHeights).toFixed(1)} px, ${s.titles.filter(t=>t.clamped).length} of ${count} titles clamped`);
      assert(s.listScrolls,label+': with '+count+' records the list scrolls inside the ledger');
      // The newest record opens first and its row is scrolled into view inside the list.
      assert.equal(s.current,1);assert.equal(s.currentId,'log-'+String(count).padStart(3,'0'));
      assert(s.currentTop>=s.listTop-1&&s.currentBottom<=s.listBottom+1,label+': the current row is outside the list viewport');
      assert.equal(s.currentRule,s.accent,label+': the current row carries the brass rule');
      assert.equal(s.currentRuleWidth,'2px');
      assert.equal(s.overflow,false);
      // At rest the top fade lies in the list's top padding, above the first row; scrolled, it stays at the list's top edge.
      const fade=await page.evaluate(async()=>{const list=document.querySelector('[data-mission-index-list]'),first=list.querySelector('.mission-jump-card');
        const frame=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));const before=list.scrollTop;
        list.scrollTop=0;await frame();const height=parseFloat(getComputedStyle(list,'::before').height),position=getComputedStyle(list,'::before').position;
        const firstOffset=first.getBoundingClientRect().top-list.getBoundingClientRect().top;list.scrollTop=before;await frame();return {height,position,firstOffset};});
      assert.equal(fade.position,'sticky',label);
      assert(fade.height>0&&fade.firstOffset>=fade.height-.5,label+': the top fade covers the first row at rest '+JSON.stringify(fade));
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
      assert.deepEqual(s.rowHeights,rest,label+': moving the current row changed row heights');
      assert(s.currentTop>=s.listTop-1&&s.currentBottom<=s.listBottom+1,label+': the chosen row left the list viewport');
      await context.close();
      console.log(`PASS ${label}: open, sticky, scrolling ledger with the current row in view`);
    }
    for(const width of [1199,1024,768,390]){
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
      assertRowsReadable(s,label);
      await steadyRows(page,label);
      console.log(`${label}: rows ${Math.min(...s.rowHeights).toFixed(1)} to ${Math.max(...s.rowHeights).toFixed(1)} px, ${s.titles.filter(t=>t.clamped).length} of ${count} titles clamped`);
      assert.equal(s.fadeContent,'none',label+': below 1200 px the list has no top fade over its rows');
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
