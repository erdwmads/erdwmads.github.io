// The CSS lint's rules (scripts/lib/css-lint.mjs) against known selectors and text, so a weakened rule fails here
// before it lets a stylesheet through: the compound limit with several functional pseudo-classes, nesting, the
// case of !important and theme selectors, remote addresses outside url(), and the pinned headers.
import assert from "node:assert/strict";
import test from "node:test";
import { bans, countImportant, namesThemeSelector, nestedRules, pinnedHeaders, weighComplex } from "./lib/css-lint.mjs";
import { bundleSources } from "./lib/read-bundle-source.mjs";
import { folioStylesDir } from "./lib/site-paths.mjs";

test("a compound weighs every class, attribute and pseudo-class, each :is(), :not() and :has() by its heaviest argument", () => {
  for (const [selector, worst] of [
    [".a.b:not(.c):not(.d)", 4],
    [".x:not(.a.b):not(.c.d)", 5],
    [".a:is(.b):is(.c):is(.d)", 4],
    [".button:not(.secondary):not([disabled])", 3],
    [".a:is(.b, .c.d)", 3],
    [":where(.a.b.c.d) .e", 1],
    [".ui-page-home .plate__media::after", 1],
    ["html:root:root body", 2],
    [".pathway-chip[data-status=\"in-progress\"]::before", 2]
  ]) {
    assert.equal(weighComplex(selector).worst, worst, selector);
  }
  assert.equal(weighComplex("#main .a").ids, 1);
  assert.equal(weighComplex(":where(#main) .a").ids, 0);
  assert.equal(weighComplex(".a:not(#b)").ids, 1);
});

test("a rule nested in a style rule, or a selector with &, is reported", () => {
  assert.deepEqual(nestedRules(".a.b { color: red; &.c.d { color: blue; } }"), ["&.c.d"]);
  assert.deepEqual(nestedRules(".a { .b { color: red; } }"), [".b"]);
  assert.deepEqual(nestedRules(".a { @media (min-width: 1px) { color: red; } }"), ["@media (min-width: 1px)"]);
  assert.deepEqual(nestedRules("@media (min-width: 1px) { .a { color: red; } } @keyframes k { from { opacity: 0; } to { opacity: 1; } }"), []);
  assert.deepEqual(nestedRules("@supports selector(::details-content) { :where(details)::details-content { overflow: clip; } }"), []);
});

test("the bans, !important and theme selectors ignore case and spacing", () => {
  const banned = (css) => bans.filter(([pattern]) => pattern.test(css)).map(([, name]) => name);
  assert.deepEqual(banned(".a { BACKDROP-FILTER: blur(2px) }"), ["backdrop-filter"]);
  assert.deepEqual(banned(".a { background: url( 'https://example.com/x.png') }"), ["a remote url()", "a remote address in a string (image-set() or src)"]);
  assert.deepEqual(banned(".a { background: url(//example.com/x.png) }"), ["a remote url()"]);
  assert.deepEqual(banned(".a { background-image: image-set(\"https://example.com/x.png\" 1x) }"), ["a remote address in a string (image-set() or src)"]);
  assert.deepEqual(banned(".a { content: \"//\"; background: url(\"../img/x.webp\") }"), []);
  assert.deepEqual(banned("@LAYER base; @Import \"x.css\";"), ["@layer", "@import"]);
  assert.equal(countImportant(".a { color: red !IMPORTANT; margin: 0 ! important } /* !important */"), 2);
  assert.ok(namesThemeSelector("[ data-theme=\"light\"] .a { color: red }"));
  assert.ok(namesThemeSelector("[DATA-THEME] .a { color: red }"));
  assert.ok(!namesThemeSelector("/* [data-theme] */ .a { color: red }"));
});

test("every manifest file has a pinned header, and every pinned file is in the manifest", () => {
  const listed = bundleSources().map(({ file }) => file.slice(folioStylesDir.length + 1));
  assert.deepEqual(listed, Object.keys(pinnedHeaders), "the pinned table follows the manifest, in cascade order");
  const important = Object.values(pinnedHeaders).reduce((sum, [, , count]) => sum + count, 0);
  assert.ok(important <= 30, `the pinned headers allow ${important} !important, over 30`);
});
