// Legibility gate (spec §2.6): the string "CI1 · Il1 · 11 of 11 · Ioong · Ca–Mg · μ-XRD · 6×7" set at 12, 15 and 17 px
// in every weight the site sets in Montserrat (400, 500, 600, 700 and 800: version 1's type, restored on 2026-11-25, set
// lighter on 2026-11-26, when 500 joined for status words and keywords; 700 and 800 remain on a few page labels), in
// both themes side by side: the page in Light, and a panel carrying .on-night, which holds the Space tokens. Every
// face must be loaded (document.fonts.check, and a loaded FontFace for its family, weight and style), so no fallback
// glyphs stand in for the faces. μ, → and ↗ are outside the family's subsets and come from the fallback stack by
// design (public/assets/fonts/README.md). The screenshot is for the owner: --shot <file> or LEGIBILITY_SHOT, by
// default .codex_tmp/legibility-gate.png.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openGuardBrowser } from './lib/guard.mjs';

const sample = 'CI1 · Il1 · 11 of 11 · Ioong · Ca–Mg · μ-XRD · 6×7';
const faces = [
  { label: 'Montserrat 400', family: 'Montserrat', weight: 400, style: 'normal' },
  { label: 'Montserrat 500', family: 'Montserrat', weight: 500, style: 'normal' },
  { label: 'Montserrat 600', family: 'Montserrat', weight: 600, style: 'normal' },
  { label: 'Montserrat 700', family: 'Montserrat', weight: 700, style: 'normal' },
  { label: 'Montserrat 800', family: 'Montserrat', weight: 800, style: 'normal' }
];
const sizes = [12, 15, 17];
const args = process.argv.slice(2);
const shotIndex = args.indexOf('--shot');
const shot = path.resolve(shotIndex >= 0 ? args[shotIndex + 1] : process.env.LEGIBILITY_SHOT || '.codex_tmp/legibility-gate.png');

const { browser, base, close } = await openGuardBrowser();
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await context.addInitScript(() => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', 'light'); } catch {} });
  const page = await context.newPage();
  await page.goto(`${base}/404.html`);
  const result = await page.evaluate(async ({ sample, faces, sizes }) => {
    const css = (face, size) => `${face.style === 'italic' ? 'italic ' : ''}${face.weight} ${size}px "${face.family}"`;
    const rows = faces.map(face => `<div class="gate-row"><span class="gate-face">${face.label}</span>${sizes.map(size => `<span class="gate-sample" style="font: ${css(face, size).replace(/"/g, "'")}; font-synthesis: none">${sample}</span>`).join('')}</div>`).join('');
    const panel = (title, extra) => `<section class="gate-panel ${extra}"><p class="gate-title">${title}</p>${rows}</section>`;
    document.body.innerHTML = `<style>
      .gate { display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 100vh; }
      .gate-panel { padding: 24px 28px; background: var(--obs-paper); color: var(--obs-text); }
      .gate-title { margin: 0 0 12px; font: 600 12px var(--type-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--obs-muted); }
      .gate-row { display: grid; gap: 4px; padding: 10px 0; border-top: 1px solid var(--obs-hairline); }
      .gate-face { font: 600 11px var(--type-sans); color: var(--obs-muted); }
      .gate-sample { display: block; white-space: nowrap; }
    </style><main class="gate">${panel('Light: 12, 15 and 17 px', '')}${panel('Space (.on-night): 12, 15 and 17 px', 'on-night')}</main>`;
    for (const face of faces) for (const size of sizes) await document.fonts.load(css(face, size), sample);
    await document.fonts.ready;
    const loaded = [...document.fonts].filter(face => face.status === 'loaded');
    const weightIn = (range, weight) => { const [low, high = low] = String(range).split(' ').map(Number); return weight >= low && weight <= high; };
    return faces.map(face => ({
      label: face.label,
      check: sizes.every(size => document.fonts.check(css(face, size), sample)),
      loaded: loaded.some(item => item.family.replace(/["']/g, '') === face.family && item.style === face.style && weightIn(item.weight, face.weight))
    }));
  }, { sample, faces, sizes });
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: true });
  console.table(result);
  const missing = result.filter(face => !face.check || !face.loaded).map(face => face.label);
  assert.deepEqual(missing, [], 'every face is loaded, so no fallback glyphs stand in for it');
  console.log(`PASS legibility gate: ${faces.length} faces at ${sizes.join(', ')} px in both themes; screenshot ${shot}`);
  await context.close();
} finally {
  await close();
}
