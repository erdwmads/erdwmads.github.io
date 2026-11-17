// Evidence status lines (spec §6.3): on every page, each visible status line shows its tag, sets its sentence at
// 14–15 px in the muted colour and is never collapsed or hidden. On Ryugu & Bennu and Origins each scene or figure
// title has its status line with the expected tag, within 120 px below the title or, on desktop, beside it in the
// notes column. The calibrated caveats stay at 13 px or more, prose keeps a 12 px floor, and meta descriptions stay
// within 155 characters. Filters and the per-page report: scripts/lib/guard.mjs.
import { gotoGuardPage, runGuard } from './lib/guard.mjs';

const titled = {
  'ryugu-bennu': { titles: ['#missions-title', '#planetary-title', '#research-scale-title'], tags: ['Illustrative model', 'Illustrative model', 'Literature'], caveats: ['.mission-footnote p', '.planetary-boundary', '.research-scale__boundary'] },
  'origins-study': { titles: ['.study-intro h1', '#mineral-budget-title'], tags: ['Illustrative model', 'Literature'], caveats: ['.study-project-context', '.scene-note p'], hash: '#stage=2&progress=.92' }
};

await runGuard('evidence-status', async (page, { entry, width, base }) => {
  const spec = titled[entry.page];
  await gotoGuardPage(page, base, entry, { waitUntil: 'networkidle', settle: 0, suffix: spec?.hash || '' });
  return page.evaluate(({ spec, desktop }) => {
    const out = [];
    const probe = (el, token) => { const i = document.createElement('i'); i.style.color = `var(${token})`; el.append(i); const value = getComputedStyle(i).color; i.remove(); return value; };
    // Every status line, wherever it is (EvidenceStatus.astro, styled by WP1's evidence-status.css).
    for (const status of document.querySelectorAll('main [data-evidence-status]')) {
      const name = `${window.__guardName(status)}[${status.dataset.evidenceStatus}]`;
      if (status.closest('[hidden], details:not([open])') || !status.getClientRects().length || getComputedStyle(status).visibility === 'hidden') {
        out.push({ owner: window.__guardOwner(status.parentElement), message: `${name} is collapsed or hidden` });
        continue;
      }
      const style = getComputedStyle(status), tag = status.querySelector('.evidence-status__tag');
      const size = parseFloat(style.fontSize);
      if (!(size >= 14 && size <= 15)) out.push({ owner: 'WP1', message: `${name} is ${size}px, not 14–15px` });
      if (style.color !== probe(status, '--obs-muted')) out.push({ owner: 'WP1', message: `${name} colour ${style.color} is not the muted token` });
      if (!tag || !tag.getBoundingClientRect().width || !tag.textContent.trim()) out.push({ owner: 'WP1', message: `${name} shows no tag` });
    }
    if (spec) {
      spec.titles.forEach((selector, index) => {
        const title = document.querySelector(selector);
        if (!title) { out.push({ owner: window.__guardPageOwner, message: `no title ${selector}` }); return; }
        // The status line follows its title, or the title's one-line lead, or the heading wrapper (two levels at most).
        let status = title.nextElementSibling;
        if (status?.matches('.lead')) status = status.nextElementSibling;
        for (let wrapper = title.parentElement, depth = 0; !status?.matches('[data-evidence-status]') && depth < 2; wrapper = wrapper.parentElement, depth++) status = wrapper.nextElementSibling;
        if (!status?.matches('[data-evidence-status]')) { out.push({ owner: window.__guardPageOwner, message: `no evidence status under ${selector}` }); return; }
        const tag = status.querySelector('.evidence-status__tag')?.firstChild?.textContent.trim();
        if (tag !== spec.tags[index]) out.push({ owner: window.__guardPageOwner, message: `${selector}: tag "${tag}", expected "${spec.tags[index]}"` });
        const rect = status.getBoundingClientRect(), titleRect = title.getBoundingClientRect();
        const below = rect.top - titleRect.bottom >= -1 && rect.top - titleRect.bottom < 120;
        const beside = desktop && (status.closest('.in-notes') || rect.left >= titleRect.right - 1) && rect.top < titleRect.bottom + 120;
        if (!below && !beside) out.push({ owner: window.__guardPageOwner, message: `${selector}: status is ${Math.round(rect.top - titleRect.bottom)}px from its title, not under it or beside it in the notes` });
      });
      for (const selector of spec.caveats) {
        const el = document.querySelector(selector);
        const size = el ? parseFloat(getComputedStyle(el).fontSize) : 0;
        if (size < 13) out.push({ owner: window.__guardPageOwner, message: `caveat ${selector} is ${size}px, under 13px` });
      }
    }
    // Prose floor: sentences in paragraphs, list items, definitions and captions are at least 12 px. Live readouts and
    // the shell's onward links are not prose.
    for (const el of document.querySelectorAll('main :is(p,li,dd,figcaption)')) {
      if (el.closest('[hidden],details:not([open]),[role="status"],.continue-reading,.research-guide') || !el.getClientRects().length) continue;
      const text = [...el.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim();
      if (text.split(/\s+/).length >= 3 && parseFloat(getComputedStyle(el).fontSize) < 12) out.push({ owner: window.__guardOwner(el), message: `prose under 12px: ${window.__guardName(el)} ${getComputedStyle(el).fontSize} "${el.textContent.trim().slice(0, 40)}"` });
    }
    const description = document.querySelector('meta[name="description"]')?.content || '';
    if (description.length > 155) out.push({ owner: window.__guardPageOwner, message: `meta description has ${description.length} characters` });
    return out;
  }, { spec, desktop: width >= 1200 });
}, { contextOptions: { reducedMotion: 'reduce' } });
