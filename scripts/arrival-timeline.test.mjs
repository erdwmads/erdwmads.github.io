import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arrivalProgress } from '../src/scripts/arrival/timeline.js';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url));

test('arrival clock has exact endpoints, stays monotonic, and eases both ends', () => {
  assert.equal(arrivalProgress(0), 0);
  assert.equal(arrivalProgress(1), 1);
  let previous = 0;
  for (let i = 1; i <= 1000; i++) {
    const p = arrivalProgress(i / 1000);
    assert.ok(p >= previous && p <= 1);
    previous = p;
  }
  const speed = t => (arrivalProgress(t + .001) - arrivalProgress(t)) / .001;
  assert.ok(speed(.4) > speed(.02) * 3);
  assert.ok(speed(.4) > speed(.97) * 3);
  for (let i = 1; i < 999; i++) assert.ok(Math.abs(speed(i / 1000) - speed((i - 1) / 1000)) < .02);
});

test('inline fallback and module share a short preparing cap and the same Save-Data skip', () => {
  // The inline opener is rendered from its own file so the Content Security Policy can hash it (src/lib/inline-scripts.ts).
  assert.match(String(source('src/components/CosmicArrival.astro')), /<script is:inline data-arrival-gate set:html=\{inlineScripts\.arrivalGate\}><\/script>/);
  const inline = String(source('src/scripts/inline/arrival-gate.js'));
  const entry = String(source('src/scripts/arrival/entry.js'));
  const inlineCap = Number(inline.match(/cosmicArrivalFallback=setTimeout\(.*?,(\d+)\);/)?.[1]);
  const moduleCap = Number(entry.match(/PREPARE_CAP=(\d+)/)?.[1]);
  assert.equal(inlineCap, moduleCap, 'One cap for the inline fallback and entry.js');
  assert.ok(moduleCap >= 2500 && moduleCap <= 3000, `Preparing cap stays near 3 s (${moduleCap} ms)`);
  assert.match(entry, /timer=setTimeout\(finish,Math\.max\(0,opened\+PREPARE_CAP-performance\.now\(\)\)\)/, 'The module counts the cap from when the dialog opened');
  for (const text of [inline, entry]) assert.match(text, /navigator\.connection\?\.saveData/, 'Save-Data skips the entrance');
});

test('arrival and orbit view use viewport-sized Earth maps derived from the 4096 originals', () => {
  // Lossy WebP: the VP8 key frame stores 14-bit width and height after its start code.
  const size = path => {
    const data = source(`public/assets/img/arrival/${path}`);
    assert.equal(data.toString('ascii', 8, 16), 'WEBPVP8 ', `${path} is a simple lossy WebP`);
    return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
  };
  for (const name of ['earth-day', 'earth-night']) {
    assert.deepEqual(size(`${name}-2048.webp`), [2048, 1024]);
    assert.deepEqual(size(`${name}-1024.webp`), [1024, 512]);
  }
  const solar = String(source('src/scripts/arrival/solar.js')), orbit = String(source('src/scripts/planetary-renderer.js'));
  assert.match(solar, /const res=innerWidth<700\?1024:2048;/);
  assert.match(solar, /earth-day-\$\{res\}\.webp/);
  assert.match(solar, /earth-night-\$\{res\}\.webp/);
  assert.match(orbit, /earth-day-\$\{innerWidth<700\?1024:2048\}\.webp/);
  for (const text of [solar, orbit]) assert.doesNotMatch(text, /earth-(day|night)\.jpg/, 'the entrance and orbit view use the WebP derivatives; earth-day.jpg stays only for the sample-missions close-up');
});
