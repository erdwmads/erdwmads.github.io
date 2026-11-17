import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './lib/site-paths.mjs';
// Markup and script contracts of the Mission Index (spec §3.3, §3.4). The contained-figure check moved to the browser
// tests (progress-polish, mission-experience) and the colour pin is dropped (spec §6.3).
const shell=read('src/components/MissionLogShell.astro');
const script=read('public/assets/js/mission-index.js');
test('the Mission Index is a ledger disclosure that the script keeps open from 1200 px and counts in its summary',()=>{
  assert.match(shell,/<details class="mission-ledger">\s*<summary[^>]*>[\s\S]*data-i18n-key="missionIndexCount"[\s\S]*<\/summary>[\s\S]*data-mission-index-list[\s\S]*<\/details>/);
  assert.match(script,/matchMedia\?\.\('\(min-width: 1200px\)'\)/);
  assert.match(script,/closest\?\.\('details'\)/);
  assert.match(script,/\[data-i18n-key="missionIndexCount"\]/);
  // The server copy never carries an archive count.
  assert.doesNotMatch(shell,/\d+\s+records?/);
});
test('timeline is a labelled keyboard-scrollable region and does not pin an obsolete latest log',()=>{
  assert.match(shell,/data-mission-index-list role="region" aria-label="Experiment timeline" tabindex="0"/);
  assert.doesNotMatch(shell,/data-initial-log-id=/);
});
