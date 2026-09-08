import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const routes=['index','research','cv','paper-shelf','photography','contact','research-log','research-graduation','sample-cabinet'];
const failures=[];
try {
  for(const width of [1440,390,320])for(const theme of ['space','light']){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<760,isMobile:width<760,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[],remoteFonts=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/fonts\.(googleapis|gstatic)\.com/.test(r.url()))remoteFonts.push(r.url());});
    await page.addInitScript(theme=>{localStorage.setItem('mads-theme',theme);sessionStorage.setItem('mads-entry-gate-v1','done');},theme);
    for(const route of routes){
      try{
        await page.goto(`http://127.0.0.1:4322/${route}.html`);
        await page.evaluate(()=>document.fonts.ready);
        assert((await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)).startsWith('Inter'));
        assert((await page.locator('h1').first().evaluate(el=>getComputedStyle(el).fontFamily)).startsWith('Montserrat'));
        const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family));
        assert(fonts.includes('Inter')&&fonts.includes('Montserrat'),'real local font faces loaded');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page horizontal overflow');
        const clipped=await page.locator('main .button, .nav a, .theme-toggle').evaluateAll(nodes=>nodes.filter(el=>el.getBoundingClientRect().width>0&&el.scrollWidth>el.clientWidth+2).map(el=>el.textContent.trim()));
        assert.deepEqual(clipped,[],'control labels overflow');
        if(['index','research','cv','contact','research-graduation'].includes(route)&&width!==390)await page.screenshot({path:`.codex_tmp/type-${route}-${width}-${theme}.png`});
      }catch(error){failures.push(`${route} ${width}px ${theme}: ${error.message}`);}
    }
    assert.deepEqual(remoteFonts,[],'no external font requests');
    assert.deepEqual(errors,[]);
    console.log(`CHECKED 9 pages at ${width}px ${theme}`);
    await context.close();
  }
  assert.deepEqual(failures,[]);
  console.log('PASS 54 page/theme/viewport checks: local fonts, hierarchy, labels and overflow');
}finally{await browser.close();}
