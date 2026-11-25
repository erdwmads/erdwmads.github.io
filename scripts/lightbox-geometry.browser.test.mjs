// Mission Log lightbox geometry (spec §4.11, §5 row 29, §6.5), with a synthetic encrypted archive only. On desktop
// the open viewer sits on its theme's veil, nearly opaque (inventory E045: dark in Space, pale paper in Light), with
// no backdrop blur; the image ends above the caption,
// which stays inside the viewport and wraps even when long; the controls are 44 px targets in the viewport; the
// ambient and orbit animations behind it are paused; at 1440 px it lies over the floating header and its band. On a
// phone the viewer never shows.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const password='synthetic lightbox fixture';
// Public research-scale images give real wide and tall shapes; the record and captions are synthetic.
const images=['bennu-microstructure.jpg','orgueil-smithsonian.jpg','bennu-whole.png'];
const long='A deliberately long synthetic caption that must wrap inside the caption column below the image and never run over it or out of the viewport, however many lines it takes on a narrow desktop window. '.repeat(3);
const figures=images.map((file,i)=>`<figure><img src="assets/img/research-scale/${file}" data-full-src="assets/img/research-scale/${file}" alt="Synthetic figure ${i+1}"><figcaption><strong>Fig. ${i+1}</strong> ${i===2?long:'Synthetic caption '+(i+1)+'.'}</figcaption></figure>`).join('');
const entries=[{id:'log-001',number:1,label:'LOG 001',date:'2026/09/01',bodyHtml:`<h3>Synthetic record</h3><div class="mission-photo-grid">${figures}</div>`}];
const salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(password,salt,600000,32,'sha256'),iv);
const payload={version:1,kdf:'PBKDF2-SHA-256',iterations:600000,cipher:'AES-256-GCM',salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:Buffer.concat([cipher.update(JSON.stringify(entries)),cipher.final(),cipher.getAuthTag()]).toString('base64')};
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const errors=[];
async function unlocked(viewport,theme,phone=false){
  const context=await browser.newContext({viewport,isMobile:phone,hasTouch:phone});
  await context.addInitScript(t=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',t);},theme);
  await context.route('**/assets/data/mission-log.enc.json',route=>route.fulfill({json:payload}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/research-graduation.html');
  await page.locator('[data-research-lock-input]').fill(password);
  await page.locator('[data-research-lock-form] button[type="submit"]').click();
  await page.locator('.mission-photo-grid figure').first().waitFor();
  return {context,page};
}
const geometry=page=>page.evaluate(()=>{
  const q=s=>document.querySelector(s),r=el=>el.getBoundingClientRect(),overlay=q('.mission-lightbox');
  const img=q('.mission-lightbox__img'),bar=q('.mission-lightbox__captionbar'),caption=q('.mission-lightbox__caption');
  // The painted image: object-fit contain letterboxes the natural size inside the element box.
  const box=r(img),scale=Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight),paintedBottom=box.top+(box.height+img.naturalHeight*scale)/2;
  const probe=document.createElement('i');document.body.append(probe);probe.style.background='var(--obs-lightbox-veil)';const screen=getComputedStyle(probe).backgroundColor;probe.remove();
  // Keyframe and scripted animations of the FX layers; a meteor already in flight only finishes its transition.
  const running=document.getAnimations().filter(a=>a.playState==='running'&&!(a instanceof CSSTransition)&&a.effect?.target?.closest?.('.ambient-space-layer, .ui2046-layer'));
  const spawned=[...document.querySelectorAll('.ambient-meteor')].filter(m=>!window.__meteorsBefore?.has(m)).length;
  const veil=getComputedStyle(overlay).backgroundColor.match(/[\d.]+/g).map(Number);
  return {open:overlay.classList.contains('is-open'),ready:img.classList.contains('is-ready'),background:getComputedStyle(overlay).backgroundColor,screen,light:veil[0]>128,
    blur:getComputedStyle(overlay).backdropFilter,imageBottom:box.bottom,paintedBottom,captionTop:r(bar).top,captionBottom:r(bar).bottom,captionRight:r(bar).right,
    captionOverflow:caption.scrollWidth>caption.clientWidth+1,captionFixed:getComputedStyle(bar).position==='fixed',
    controls:[...overlay.querySelectorAll('button')].map(el=>{const b=r(el);return [b.width,b.height,b.left,b.top,b.right,b.bottom];}),
    ambientPaused:!q('.ambient-space-layer')||q('.ambient-space-layer').classList.contains('ambient-paused'),running:running.length,
    spawned,locked:document.documentElement.classList.contains('mission-lightbox-open'),
    // The floating header and its band lie under the viewer.
    onTop:Boolean(document.elementsFromPoint(innerWidth/2,10)[0]?.closest('.mission-lightbox'))};
});
try{
  for(const theme of ['space','light']){
    for(const [width,height] of [[1440,900],[1024,640]]){
      const {context,page}=await unlocked({width,height},theme);
      for(const index of [0,1,2]){
        await page.locator('.mission-photo-grid figure').nth(index).click();
        await page.locator('.mission-lightbox__img.is-ready').waitFor();
        // Count meteors from the moment the viewer is open: one launched while the click was still on its way is not
        // behind the viewer.
        await page.evaluate(()=>{window.__meteorsBefore=new Set(document.querySelectorAll('.ambient-meteor'));});
        // Longer than the meteor interval on the first figure, so a spawn behind the viewer would show.
        await page.waitForTimeout(index?400:2600);
        const g=await geometry(page),label=`${theme} ${width}x${height} figure ${index+1}`;
        assert.equal(g.open,true,label);
        assert.equal(g.background,g.screen,label+': the viewer is not on its veil');
        const alpha=Number((g.background.match(/rgba\([^)]*,\s*([\d.]+)\)/)||[0,1])[1]);
        assert(alpha>=.95,label+': the veil lets the page show through ('+g.background+')');
        assert.equal(g.light,theme==='light',label+': the veil does not follow the page theme ('+g.background+')');
        assert.equal(g.blur,'none',label+': backdrop blur');
        assert.equal(g.captionFixed,false,label+': the caption overlays the image');
        assert(g.imageBottom<=g.captionTop+0.5&&g.paintedBottom<=g.captionTop+0.5,label+`: image bottom ${g.imageBottom}/${g.paintedBottom} below caption top ${g.captionTop}`);
        assert(g.captionTop>=0&&g.captionBottom<=height+0.5&&g.captionRight<=width+0.5,label+': the caption leaves the viewport');
        assert.equal(g.captionOverflow,false,label+': the caption does not wrap');
        assert(g.controls.every(([w,h,l,t,r,b])=>w>=44&&h>=44&&l>=0&&t>=0&&r<=width&&b<=height),label+': a control is small or outside the viewport '+JSON.stringify(g.controls));
        assert.equal(g.ambientPaused,true,label+': the ambient layer keeps running');
        assert.equal(g.running,0,label+': an ambient or orbit animation runs behind the viewer');
        assert.equal(g.spawned,0,label+': a meteor started behind the viewer');
        if(width===1440) assert.equal(g.onTop,true,label+': the floating header or its band lies over the viewer');
        assert.equal(g.locked,true,label+': the page scroll is not locked');
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!document.querySelector('.mission-lightbox.is-open'));
        // It fades out within 320 ms and is then hidden again.
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('.mission-lightbox')).visibility==='hidden',null,{timeout:2000});
      }
      await context.close();
      console.log(`PASS ${theme} ${width}x${height}: screen ground, image above an in-viewport caption, 44 px controls, ambient paused`);
    }
    const {context,page}=await unlocked({width:390,height:844},theme,true);
    await page.locator('.mission-photo-grid img').first().evaluate(el=>el.scrollIntoView({block:'center'}));
    // The image itself takes no pointer events here, so the tap lands on its figure, which opens nothing.
    await page.locator('.mission-photo-grid figure').first().tap();
    assert.equal(await page.locator('.mission-lightbox').evaluate(el=>getComputedStyle(el).display),'none',theme+' 390: the viewer shows on a phone');
    assert.equal(await page.locator('.mission-photo-grid img').first().evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    assert.equal(await page.locator('.mission-photo-grid figcaption').first().isVisible(),true);
    await context.close();
    console.log(`PASS ${theme} 390: inline figures with captions, no viewer`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
