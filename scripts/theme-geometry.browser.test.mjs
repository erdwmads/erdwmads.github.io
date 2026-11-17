// Theme geometry ("two editions, one book"): switching between Space and Light moves no visible control by more than
// 0.5 px, at 1536, 390 and 320 px (the phone menu opened) on eight pages. Each moved control is a finding for its
// owner (the theme toggle and header links are WP2's). Filters and the per-page report: scripts/lib/guard.mjs.
import { gotoGuardPage, runGuard } from './lib/guard.mjs';

await runGuard('theme-geometry', async (page, { entry, width, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 500 });
  if (width < 761) await page.locator('.nav-toggle').click();
  const capture = () => page.evaluate(() => Array.from(document.querySelectorAll('.nav a,.theme-toggle,main .button,main .pill,main button,main input,main select,.nav-log-gate')).filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent.trim().slice(0, 55), owner: window.__guardOwner(e), name: window.__guardName(e), x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; }));
  const before = await capture();
  await page.locator('.theme-toggle').first().evaluate(e => e.click());
  await page.waitForTimeout(500);
  const after = await capture();
  return before.flatMap((d, i) => {
    const l = after[i];
    if (!l) return [{ owner: d.owner, message: `${d.name} "${d.text}" disappears after the theme switch` }];
    const moved = ['x', 'y', 'w', 'h'].filter(k => Math.abs(d[k] - l[k]) > .5);
    return moved.length ? [{ owner: d.owner, message: `${d.name} "${d.text}" changes ${moved.map(k => `${k} ${d[k].toFixed(1)} -> ${l[k].toFixed(1)}`).join(', ')}` }] : [];
  });
}, {
  widths: [1536, 390, 320],
  themes: ['space'],
  pages: ['index', 'research', 'cv', 'paper-shelf', 'photography', 'contact', 'research-graduation', 'research-log'],
  contextOptions: { reducedMotion: 'reduce', isMobile: false, hasTouch: false, height: 1000 }
});
