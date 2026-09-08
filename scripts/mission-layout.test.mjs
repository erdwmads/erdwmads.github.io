import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../public/assets/css/observatory-experience.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/components/MissionLogShell.astro',import.meta.url),'utf8');
test('scientific thumbnails preserve the entire image rather than cropping spectra and scale bars',()=>{
  assert.match(css,/\.mission-log-entry \.mission-photo-grid img\s*\{[^}]*object-fit:\s*contain\s*!important/s);
});
test('light-mode log tags use a legible dark accent',()=>{
  assert.match(css,/html\[data-theme="light"\][^{]+\.mission-log-entry :is\(\.research-note-date, \.log-tags span\)\s*\{[^}]*color:\s*#70521c\s*!important/s);
});
test('timeline is a labelled keyboard-scrollable region and does not pin an obsolete latest log',()=>{
  assert.match(shell,/data-mission-index-list role="region" aria-label="Experiment timeline" tabindex="0"/);
  assert.doesNotMatch(shell,/data-initial-log-id=/);
});
