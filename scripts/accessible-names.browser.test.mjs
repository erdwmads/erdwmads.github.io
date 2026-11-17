// Accessible names (spec §5 row 2, §6.5): one table of role and name per control across all pages, read through the
// browser's accessibility tree (Playwright getByRole): the skip link and main landmark; the main navigation; the theme
// toggle names its action ("Switch to Light Mode" in Space) beside its visible state, without aria-pressed; the brand
// link is its visible text plus ", home"; the phone Menu button shows "Menu" and is named "Open menu" (spec R5); the
// Research Log gate, current on its pages; the "Visual effects" settings and the "FX On"/"FX Off" toggle on desktop;
// the footer ORCID link; the Home polarisation emblem; one "Copy reference: …" button per paper. Then two rules for
// every visible control on the page: it has a name, and a name set with aria-label contains every word of the
// visible text (WCAG 2.5.3). Filters and the per-page report: scripts/lib/guard.mjs.
import { gotoGuardPage, runGuard } from './lib/guard.mjs';

const normalise = text => text.replace(/\s+/g, ' ').trim();
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// scope: the element the row names (so a link elsewhere on the page with a similar name does not count).
const table = [
  { owner: 'WP1', label: 'skip link', scope: '.site-skip-link', role: 'link', name: 'Skip to content', exact: true },
  { owner: 'WP1', label: 'main landmark', scope: 'main', role: 'main' },
  { owner: 'WP2', label: 'main navigation', scope: 'nav.nav', role: 'navigation', name: 'Main navigation', exact: true },
  { owner: 'WP2', label: 'theme toggle', scope: '.theme-toggle', role: 'button', name: ({ theme }) => `Switch to ${theme === 'light' ? 'Space' : 'Light'} Mode`, exact: true },
  { owner: 'WP2', label: 'Research Log gate', scope: '.nav-log-gate', role: 'link', name: /^Research Log\b/ },
  { owner: 'WP2', label: 'Menu button', scope: '.nav-toggle', role: 'button', name: 'Open menu', exact: true, when: ({ width }) => width <= 760 },
  { owner: 'WP2', label: 'visual effects settings', scope: '.obs-fx-settings', role: 'button', name: 'Visual effects', exact: true, when: ({ width }) => width > 760 },
  { owner: 'WP2', label: 'FX toggle', scope: '.ambient-fx-toggle', role: 'button', name: /^FX (On|Off)$/, when: ({ width }) => width > 760 },
  { owner: 'WP2', label: 'footer ORCID link', scope: '.site-footer .orcid-link', role: 'link', name: /ORCID iD.*\(opens in a new tab\)/ },
  { owner: 'WP3', label: 'polarisation emblem', scope: '[data-polarisation]', role: 'button', name: 'Mineralogy Laboratory: polarisation', exact: true, pages: ['index'] },
  { owner: 'WP5', label: 'Copy reference buttons', scope: '[data-paper-copy]', role: 'button', name: /^Copy reference: \S/, pages: ['paper-shelf'], count: page => page.locator('[data-paper-copy]').count() }
];

// Runs in the page: the text a sighted reader sees, without visually hidden spans or aria-hidden decoration.
function installSeen() {
  window.__guardSeen = el => [...el.childNodes].map(node => (node.nodeType === 3 ? node.textContent
    : node.nodeType === 1 && node.getClientRects().length && node.getBoundingClientRect().width > 1 ? window.__guardSeen(node) : '')).join(' ');
}

await runGuard('accessible-names', async (page, { entry, width, theme, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 500 });
  await page.evaluate(installSeen);
  const findings = [];
  const where = { entry, width, theme };
  for (const row of table) {
    if (row.pages && !row.pages.includes(entry.page)) continue;
    if (row.when && !row.when(where)) continue;
    const name = typeof row.name === 'function' ? row.name(where) : row.name;
    const found = await page.locator(row.scope).and(page.getByRole(row.role, { ...(name ? { name, exact: row.exact } : {}), includeHidden: true })).count();
    const expected = row.count ? await row.count(page) : 1;
    if (found !== expected) findings.push({ owner: row.owner, message: `${row.label}: ${found} ${row.scope} named ${name ?? '(any)'} as ${row.role}, expected ${expected}` });
  }
  // The theme toggle shows its state and has no pressed state; the Menu button shows its word; the gate is the
  // current page on the Research Log pages; the brand's name is its visible text plus ", home".
  const shell = await page.evaluate(({ theme, width }) => {
    const out = [];
    const toggle = document.querySelector('.theme-toggle');
    if (toggle && (toggle.textContent.trim() !== (theme === 'light' ? 'Space Mode' : 'Light Mode') || toggle.hasAttribute('aria-pressed'))) out.push(`theme toggle shows "${toggle.textContent.trim()}"${toggle.hasAttribute('aria-pressed') ? ' with aria-pressed' : ''}`);
    const menu = document.querySelector('.nav-toggle');
    if (width <= 760 && menu && !/\bMenu\b/.test(window.__guardSeen(menu))) out.push(`Menu button shows "${window.__guardSeen(menu).trim()}", not the word Menu`);
    const brand = document.querySelector('.brand');
    return { out, brandText: brand ? window.__guardSeen(brand) : '', gate: document.querySelector('.nav-log-gate')?.getAttribute('aria-current') };
  }, { theme, width });
  findings.push(...shell.out.map(message => ({ owner: 'WP2', message })));
  // The source's whitespace before the hidden ", home" may reach the name; it changes nothing a reader hears. No
  // includeHidden: with it, the tagline that is display:none below 1360 px would count towards the name.
  const brandText = normalise(shell.brandText);
  if (await page.locator('.brand').and(page.getByRole('link', { name: new RegExp(`^${escape(brandText)}\\s*, home$`) })).count() !== 1) findings.push({ owner: 'WP2', message: `brand link is not named "${brandText}, home" (its visible text plus ", home")` });
  if (['research-log', 'research-graduation'].includes(entry.page) && shell.gate !== 'page') findings.push({ owner: 'WP2', message: 'Research Log gate is not aria-current="page" on its own page' });
  // Every visible control has a name, and an aria-label contains every word of the visible text.
  findings.push(...await page.evaluate(() => {
    const out = [];
    const text = el => [...el.childNodes].map(node => (node.nodeType === 3 ? node.textContent : node.nodeType === 1 && node.getAttribute('aria-hidden') !== 'true' ? (node.matches('img') ? node.alt || '' : text(node)) : '')).join(' ');
    const clean = value => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const words = value => clean(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"]')) {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden' || el.closest('[inert], [aria-hidden="true"]')) continue;
      const labelled = el.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
      const labels = el.labels ? [...el.labels].map(label => label.textContent).join(' ') : '';
      const name = clean(labelled || el.getAttribute('aria-label') || labels || text(el) || el.getAttribute('title') || el.getAttribute('placeholder') || (el.type === 'submit' ? 'submit' : el.value));
      // Label in name applies to the words on a button or link; a field's visible label sits outside it.
      const visible = el.matches('input, select, textarea') ? '' : window.__guardSeen(el);
      const label = `${window.__guardName(el)} "${clean(visible).slice(0, 30)}"`;
      if (!name) out.push({ owner: window.__guardOwner(el), message: `${label} has no accessible name` });
      const missing = words(visible).filter(word => !words(el.getAttribute('aria-label')).includes(word));
      if (el.hasAttribute('aria-label') && missing.length) out.push({ owner: window.__guardOwner(el), message: `${label}: the name "${el.getAttribute('aria-label')}" lacks the visible ${missing.slice(0, 3).join(', ')}` });
    }
    return out;
  }));
  return findings;
});
