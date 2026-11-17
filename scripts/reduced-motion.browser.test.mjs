// Reduced motion (spec §2.6 motion, §5 row 38, §6.5): with prefers-reduced-motion: reduce, every computed transition
// and animation on every element and pseudo-element (::before, ::after, the ::details-content of each disclosure and
// the ::backdrop of each dialog) takes no time, except an opacity fade of at most 120 ms (the
// --motion-fade allowance in states/motion.css); no running animation, CSS or scripted, lasts longer; scrolling is not
// smooth; and neither the ambient field nor the orbits are mounted (FX is off under reduced motion; the spine stays).
// The page is checked after load and again after hovering and focusing its first controls, which start transitions.
// Then a disclosure of WP1's stand-in fixture is opened: its content reaches full height at once.
// Filters and the per-page report: scripts/lib/guard.mjs.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const sweep = () => {
  const out = [];
  const seconds = value => value.split(',').map(part => parseFloat(part) * (part.trim().endsWith('ms') ? 0.001 : 1));
  // The global override in states/motion.css (WP1) is !important, which the lint allows nowhere else, so motion that
  // survives it from a stylesheet is WP1's. Only an inline style a script writes can beat it: that is the element's
  // owner's, as is a scripted Web Animation.
  const inline = el => el.style && /transition|animation/.test(el.getAttribute('style') || '');
  const cssOwner = el => (inline(el) ? window.__guardOwner(el) : 'WP1');
  for (const el of document.querySelectorAll('*')) {
    const extra = el.matches('details') ? ['::details-content'] : el.matches('dialog') ? ['::backdrop'] : [];
    for (const pseudo of [null, '::before', '::after', ...extra]) {
      const style = getComputedStyle(el, pseudo);
      if ((pseudo === '::before' || pseudo === '::after') && style.content === 'none') continue;
      const name = `${window.__guardName(el)}${pseudo || ''}`;
      const animations = style.animationName.split(',').map(part => part.trim());
      seconds(style.animationDuration).forEach((duration, i) => {
        if (duration > 0 && (animations[i] || animations[0]) !== 'none') out.push({ owner: cssOwner(el), message: `${name} animates ${animations[i] || animations[0]} for ${duration}s` });
      });
      const properties = style.transitionProperty.split(',').map(part => part.trim());
      seconds(style.transitionDuration).forEach((duration, i) => {
        const property = properties[i] ?? properties[0];
        if (duration > 0 && !(property === 'opacity' && duration <= 0.12) && property !== 'none') out.push({ owner: cssOwner(el), message: `${name} transitions ${property} for ${duration}s` });
      });
    }
  }
  for (const animation of document.getAnimations()) {
    const timing = animation.effect?.getComputedTiming();
    const target = animation.effect?.target;
    const opacityOnly = animation.transitionProperty === 'opacity' || (animation.effect?.getKeyframes?.() || []).every(frame => Object.keys(frame).every(key => ['offset', 'easing', 'composite', 'computedOffset', 'opacity'].includes(key)));
    const scripted = !animation.animationName && !animation.transitionProperty;
    if (animation.playState === 'running' && timing?.duration > (opacityOnly ? 120 : 0)) out.push({ owner: scripted ? window.__guardOwner(target) : cssOwner(target), message: `${window.__guardName(target)} runs ${animation.animationName || animation.transitionProperty || 'a scripted animation'} for ${Math.round(timing.duration)} ms` });
  }
  if (getComputedStyle(document.documentElement).scrollBehavior !== 'auto') out.push({ owner: 'WP1', message: `html scroll-behavior is ${getComputedStyle(document.documentElement).scrollBehavior}` });
  for (const layer of document.querySelectorAll('.ambient-space-layer, .ui2046-solar-system')) out.push({ owner: 'WP2', message: `${window.__guardName(layer)} is mounted although FX is off under reduced motion` });
  return out;
};

await runGuard('reduced-motion', async (page, { entry, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 500 });
  const findings = await page.evaluate(sweep);
  // Hover and focus the first controls, then sweep again while their transitions would run.
  const controls = page.locator('main :is(a, button, summary):visible, .site-header :is(a, button):visible');
  for (let i = 0; i < Math.min(await controls.count(), 4); i++) {
    await controls.nth(i).hover({ timeout: 2000 }).catch(() => {});
    await controls.nth(i).focus().catch(() => {});
  }
  await page.waitForTimeout(30);
  findings.push(...await page.evaluate(sweep));
  // A disclosure opens at once: its height right after the click is its final height.
  await insertFixture(page);
  const disclosure = page.locator('[data-guard-fixture] details').first();
  await disclosure.locator('summary').click();
  const heights = [];
  for (const wait of [0, 60, 300]) {
    await page.waitForTimeout(wait);
    heights.push(await disclosure.evaluate(el => Math.round(el.getBoundingClientRect().height)));
  }
  if (new Set(heights).size > 1) findings.push({ owner: 'WP1', message: `the fixture disclosure animates its height while opening (${heights.join(', ')} px at 0, 60 and 360 ms)` });
  findings.push(...await page.evaluate(sweep));
  return findings;
}, { contextOptions: { reducedMotion: 'reduce' } });
