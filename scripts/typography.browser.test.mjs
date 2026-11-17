// Typography (spec §2.6, §6.3): body text, controls and labels are set in Source Sans 3; h1–h3, the owner's names
// and leads in Source Serif 4. The serif is never smaller than 18 px, so a name set below that (the masthead meta
// line, a citation) stays in the sans and only names at 18 px or more must be in the serif. The faces load from
// this site only (no Montserrat, Inter or Manrope, nothing remote), document.fonts reports them loaded, no font file
// fails, labels are not clipped and nothing overflows sideways.
// Pages, widths and themes follow the guard filters (scripts/lib/guard.mjs); findings are reported per page.
import { gotoGuardPage, runGuard } from './lib/guard.mjs';

const retired = /montserrat|inter-|manrope/i;

await runGuard('typography', async (page, { entry, base }) => {
  const findings = [];
  const requests = [];
  const onRequest = request => { if (request.resourceType() === 'font' || /\.woff2?(\?|$)/.test(request.url())) requests.push(request.url()); };
  page.on('request', onRequest);
  await gotoGuardPage(page, base, entry, { settle: 0 });
  page.off('request', onRequest);
  for (const url of requests) {
    if (!url.startsWith(base)) findings.push({ owner: 'WP1', message: `remote font request ${url}` });
    else if (retired.test(url)) findings.push({ owner: 'WP1', message: `retired font requested ${url.split('/').pop()}` });
  }
  const result = await page.evaluate(() => {
    const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const family = el => getComputedStyle(el).fontFamily.replace(/["']/g, '');
    const out = [];
    const size = el => parseFloat(getComputedStyle(el).fontSize);
    const expect = (selector, face, owner, minSize = 0) => {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el) || el.closest('[aria-hidden="true"], svg, canvas') || size(el) < minSize) continue;
        if (!family(el).startsWith(face)) out.push({ owner: owner || window.__guardOwner(el), message: `${window.__guardName(el)} "${el.textContent.trim().slice(0, 40)}" is set in ${family(el).split(',')[0]}, not ${face}` });
      }
    };
    // The body face is WP1's (tokens and base); the face of any other element belongs to the element's owner.
    expect('body', 'Source Sans 3', 'WP1');
    expect('button, input, select, textarea, label, .button, .kicker, .chip, .pathway-chip, .evidence-status__tag, .nav a, .theme-toggle', 'Source Sans 3');
    expect('h1, h2, h3', 'Source Serif 4');
    expect('#home-name, .brand strong', 'Source Serif 4');
    expect('.person-name', 'Source Serif 4', undefined, 17.95);
    expect('.lead, .masthead__lead', 'Source Serif 4');
    // The serif's floor: no text in it below 18 px (rounded sizes such as 17.99 px count as 18).
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el) || el.closest('[aria-hidden="true"], svg, canvas') || ![...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())) continue;
      if (family(el).startsWith('Source Serif 4') && size(el) < 17.95) out.push({ owner: window.__guardOwner(el), message: `${window.__guardName(el)} "${el.textContent.trim().slice(0, 40)}" is set in Source Serif 4 at ${size(el)} px, below the serif's 18 px floor` });
    }
    const faces = [...document.fonts];
    for (const face of faces.filter(face => face.status === 'error')) out.push({ owner: 'WP1', message: `font face ${face.family} ${face.weight} ${face.style} failed to load` });
    const loaded = faces.filter(face => face.status === 'loaded').map(face => face.family.replace(/["']/g, ''));
    for (const name of loaded.filter(name => /Montserrat|Inter|Manrope/.test(name))) out.push({ owner: 'WP1', message: `retired face ${name} loaded` });
    // Every page sets body text in the sans at 400 and its h1 in the serif at 500.
    for (const spec of ['400 16px "Source Sans 3"', '500 32px "Source Serif 4"']) {
      if (!document.fonts.check(spec) || !faces.some(face => spec.includes(face.family.replace(/["']/g, '')) && face.status === 'loaded')) out.push({ owner: 'WP1', message: `document.fonts does not report ${spec} loaded` });
    }
    // Labels fit their controls.
    for (const el of document.querySelectorAll('.button, .nav a, .theme-toggle, .nav-log-gate, main button, .chip, .pathway-chip')) {
      if (visible(el) && el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 2) out.push({ owner: window.__guardOwner(el), message: `label clipped: ${window.__guardName(el)} "${el.textContent.trim().slice(0, 40)}" (${el.scrollWidth} > ${el.clientWidth})` });
    }
    return [...out, ...window.__guardOverflow()];
  });
  return [...findings, ...result];
}, { widths: [1440, 390, 320], contextOptions: { reducedMotion: 'reduce' } });
