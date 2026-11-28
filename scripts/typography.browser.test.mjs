// Typography (version 1's type, restored with its layouts on 2026-11-25; owner: "Can you merge 1 and 3?"): body text,
// headings h1–h3, leads, controls and labels are set in Montserrat; the owner's name (the brand, the Home name and
// every .person-name) in the Georgia stack. The faces load from this site only (no Source Serif 4, Source Sans 3,
// Inter or Manrope, nothing remote), document.fonts reports Montserrat loaded at the body's and the headings' 400 (quiet
// display type since 2026-11-26), the h3's 600 and the 700 of strong text, no font file fails, labels are not clipped
// and nothing overflows sideways. The headings in main and the name are set at 400, h3 at 600.
// Pages, widths and themes follow the guard filters (scripts/lib/guard.mjs); findings are reported per page.
import { gotoGuardPage, runGuard } from './lib/guard.mjs';

const retired = /source-serif|source-sans|inter-|manrope/i;

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
    const expect = (selector, face, owner) => {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el) || el.closest('[aria-hidden="true"], svg, canvas')) continue;
        if (!family(el).startsWith(face)) out.push({ owner: owner || window.__guardOwner(el), message: `${window.__guardName(el)} "${el.textContent.trim().slice(0, 40)}" is set in ${family(el).split(',')[0]}, not ${face}` });
      }
    };
    // The body face is WP1's (tokens and base); the face of any other element belongs to the element's owner.
    expect('body', 'Montserrat', 'WP1');
    expect('button, input, select, textarea, label, .button, .kicker, .chip, .pathway-chip, .evidence-status__tag, .nav a, .theme-toggle', 'Montserrat');
    expect('h1:not(#home-name), h2, h3:not(.person-name)', 'Montserrat');
    expect('.lead, .masthead__lead', 'Montserrat');
    expect('#home-name, .brand strong, .person-name', 'Georgia');
    const faces = [...document.fonts];
    for (const face of faces.filter(face => face.status === 'error')) out.push({ owner: 'WP1', message: `font face ${face.family} ${face.weight} ${face.style} failed to load` });
    const loaded = faces.filter(face => face.status === 'loaded').map(face => face.family.replace(/["']/g, ''));
    for (const name of loaded.filter(name => /Source Serif|Source Sans|Inter|Manrope/.test(name))) out.push({ owner: 'WP1', message: `retired face ${name} loaded` });
    // Every page sets body text and its headings in Montserrat at 400, h3 at 600, strong text at 700.
    for (const spec of ['400 16px Montserrat', '400 32px Montserrat', '600 20px Montserrat', '700 16px Montserrat']) {
      if (!document.fonts.check(spec) || !faces.some(face => face.family.replace(/["']/g, '') === 'Montserrat' && face.status === 'loaded')) out.push({ owner: 'WP1', message: `document.fonts does not report ${spec} loaded` });
    }
    // Labels fit their controls. Light drawn on an absolutely placed ::before or ::after (since 2026-11-26 the header
    // clusters' pools reach 40 px past their words and a link's lit pool 6 px past it) is not the label, so those layers
    // are set aside while each control is measured; in-flow pseudo-elements (arrows, glyphs) still count.
    const aside = document.createElement('style');
    aside.textContent = '[data-guard-measure~="before"]::before, [data-guard-measure~="after"]::after { display: none !important; }';
    document.head.append(aside);
    for (const el of document.querySelectorAll('.button, .nav a, .theme-toggle, .nav-log-gate, main button, .chip, .pathway-chip')) {
      if (!visible(el) || !(el.getBoundingClientRect().width > 0)) continue;
      const layers = ['before', 'after'].filter(part => getComputedStyle(el, `::${part}`).position === 'absolute');
      if (layers.length) el.setAttribute('data-guard-measure', layers.join(' '));
      const [scroll, client] = [el.scrollWidth, el.clientWidth];
      el.removeAttribute('data-guard-measure');
      if (scroll > client + 2) out.push({ owner: window.__guardOwner(el), message: `label clipped: ${window.__guardName(el)} "${el.textContent.trim().slice(0, 40)}" (${scroll} > ${client})` });
    }
    aside.remove();
    return [...out, ...window.__guardOverflow()];
  });
  return [...findings, ...result];
}, { widths: [1440, 390, 320], contextOptions: { reducedMotion: 'reduce' } });
