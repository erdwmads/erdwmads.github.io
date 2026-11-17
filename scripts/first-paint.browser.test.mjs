// First paint (spec §5 row 1, §6.5): the theme is applied before any stylesheet. With site.css held back, the html
// ground already equals the theme's ground (#0f1625 in Space, #f7f3eb in Light) through the inline preload and the
// first-paint style, with the matching color-scheme and data-theme; when storage is unavailable the page falls back
// to Space; once the stylesheet arrives, html and body keep the same ground, so there is no flash between the inline
// style and the tokens. Owned by WP1 (the shell head and 00-tokens.css). Filters and the per-page report:
// scripts/lib/guard.mjs.
import { runGuard } from './lib/guard.mjs';

const grounds = { space: 'rgb(15, 22, 37)', light: 'rgb(247, 243, 235)' };
const read = page => page.evaluate(() => {
  const html = getComputedStyle(document.documentElement);
  return { html: html.backgroundColor, body: document.body ? getComputedStyle(document.body).backgroundColor : '', scheme: html.colorScheme, theme: document.documentElement.dataset.theme, space: document.documentElement.hasAttribute('data-theme-space') };
});

async function heldLoad(page, url) {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/css/site.css*', async route => { await held; await route.continue(); });
  await page.goto(url, { waitUntil: 'commit' });
  // Rendering is blocked by the stylesheet, so poll on a timer, not on animation frames.
  await page.waitForFunction(() => document.body, null, { polling: 50 });
  const first = await read(page);
  const stylesheet = await page.evaluate(() => [...document.styleSheets].some(sheet => sheet.href?.includes('site.css')));
  release();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href?.includes('site.css')), null, { polling: 50 });
  return { first, stylesheet, loaded: await read(page) };
}

await runGuard('first-paint', async (page, { entry, theme, base, context }) => {
  const findings = [];
  const add = message => findings.push({ owner: 'WP1', message });
  const expectTheme = (state, expected, when) => {
    if (state.html !== grounds[expected]) add(`${when}: html ground ${state.html}, expected ${grounds[expected]} (${expected})`);
    if (state.scheme !== (expected === 'light' ? 'light' : 'dark')) add(`${when}: color-scheme ${state.scheme}`);
    if (state.theme !== expected || state.space !== (expected === 'space')) add(`${when}: data-theme="${state.theme}"${state.space ? ' data-theme-space' : ''}, expected ${expected}`);
  };
  const url = `${base}/${entry.page}.html`;
  const { first, stylesheet, loaded } = await heldLoad(page, url);
  if (stylesheet) add('the stylesheet was applied before the check; it was not held back');
  expectTheme(first, theme, 'before the stylesheet');
  expectTheme(loaded, theme, 'after the stylesheet');
  if (loaded.body !== grounds[theme]) add(`after the stylesheet: body ground ${loaded.body}, expected ${grounds[theme]}`);
  // A saved Light choice that cannot be read (storage blocked) falls back to Space before any stylesheet.
  if (theme === 'light') {
    const blocked = await context.newPage();
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } }));
    const fallback = await heldLoad(blocked, url);
    expectTheme(fallback.first, 'space', 'storage blocked, before the stylesheet');
    await blocked.close();
  }
  return findings;
}, { widths: [1440], freshContext: true });
