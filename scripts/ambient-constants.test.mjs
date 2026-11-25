// The ambient FX constants the owner set (spec §5 row 7, §8.2): 18% of the stardust and 7% of the meteors are gold;
// FX is on by default at every width (a lite field at 760 px and below, owner decision E103), and off under reduced
// motion or with the stored choice "0". The browser tests (home-background, ambient-resize, orbital-motion) check the
// behaviour; this test pins the numbers in the source, so a restyle of the FX layer cannot quietly change them.
import assert from "node:assert/strict";
import test from "node:test";
import { read } from "./lib/site-paths.mjs";

const source = read("public/assets/js/ambient-space.js");

test("gold is 18% of the stardust and 7% of the meteors", () => {
  assert.match(source, /const GOLD_DUST_RATIO = 0\.18;/);
  assert.match(source, /const GOLD_METEOR_RATIO = 0\.07;/);
  assert.match(source, /Math\.random\(\) < GOLD_DUST_RATIO[\s\S]{0,80}is-gold-dust|isGoldDust = Math\.random\(\) < GOLD_DUST_RATIO/);
  assert.match(source, /Math\.random\(\) < GOLD_METEOR_RATIO\) el\.classList\.add\("is-gold-meteor"\)/);
});

test("FX is on by default at every width, and off under reduced motion or when switched off", () => {
  assert.match(source, /const AMBIENT_STORAGE_KEY = "madsAmbientFxEnabled";/);
  assert.match(source, /const MOBILE_AMBIENT_MEDIA = "\(max-width: 760px\)";/);
  const enabled = source.slice(source.indexOf("function isAmbientEnabled()"), source.indexOf("function setAmbientEnabled"));
  assert.match(enabled, /if \(prefersReducedMotion\(\)\) return false;/);
  assert.doesNotMatch(enabled, /isMobileAmbientView/, "phones follow the switch (E103)");
  // Only an explicit "0" turns FX off; no stored choice (or storage that throws) leaves it on.
  assert.match(enabled, /return window\.localStorage\.getItem\(AMBIENT_STORAGE_KEY\) !== "0";/);
  assert.match(enabled, /catch \{ return true; \}/);
});

// Owner decision E103 (2026-11-18): phones get a lite field, half the dust of the phone field before b2b150b (88), no
// pebbles and half its meteor rate (one per 2.6 s), built only after load when the browser is idle.
test("phones run the lite field: 44 dust, no pebbles, a meteor every 5.2 s, built after load", () => {
  assert.match(source, /const dustCount = isMobileAmbient \? 44 : 122;/);
  assert.match(source, /const pebbleCount = isMobileAmbient \? 0 : 20;/);
  assert.match(source, /const meteorInterval = isMobileAmbient \? 5200 : 1900;/);
  assert.match(source, /"ambient-space-layer is-lite"/);
  assert.match(source, /window\.addEventListener\("load", function \(\) \{\s*\(window\.requestIdleCallback \|\| window\.setTimeout\)/);
});
