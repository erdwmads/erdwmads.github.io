// Frozen JS hooks (spec §3.5): every class, id and data attribute in scripts/lib/js-hooks.mjs is still used by the
// script that queries or creates it, and every queried one still comes from the markup or from a creating script.
// The markup has to provide a hook in its own syntax (an id as an id= value, a class in a class value or in the
// component code that builds one, a data attribute as an attribute name), not merely mention the word. And the table
// is complete: every hook a script looks up through a literal selector is in it (scanQueries).
// A hook that a planned edit of the rebuild removes (changing in js-hooks.mjs) is reported as pending for that package
// while it is missing (scripts/lib/pending.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { builtSelectors, builtToken, changing, scanQueries, scripts, selectorTokens, unsourced } from "./lib/js-hooks.mjs";
import { pendingTest } from "./lib/pending.mjs";
import { abs, exists, read } from "./lib/site-paths.mjs";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
}
const markupFiles = walk(abs("src")).filter((file) => /\.(astro|html)$/.test(file)).map((file) => fs.readFileSync(file, "utf8"));
const markup = markupFiles.join("\n");
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bare = (token) => token.replace(/^[.#]|^\[|\]$/g, "");
const word = (name) => new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`);

// Where markup can give an element a class: class="…" and class='…' values, class={…} and class:list={…}
// expressions, and the string literals of an Astro component's code fence, which builds class lists in variables.
function classSources(text) {
  const sources = [];
  for (const match of text.matchAll(/\bclass(?::list)?=(?:"([^"]*)"|'([^']*)'|\{)/g)) {
    if (match[1] !== undefined || match[2] !== undefined) {
      sources.push(match[1] ?? match[2]);
      continue;
    }
    let depth = 0, index = match.index + match[0].length - 1;
    for (; index < text.length; index++) {
      if (text[index] === "{") depth += 1;
      if (text[index] === "}" && --depth === 0) break;
    }
    sources.push(text.slice(match.index + match[0].length, index));
  }
  const fence = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (fence) sources.push(...[...fence.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)].map((match) => match[2]));
  return sources;
}
const classText = markupFiles.flatMap(classSources).join("\n");

// ui-page-* classes come from the shell's current and pageClass props, not from literal class text. An id must be an
// id= value (or a quoted string inside an id={…} expression); a data attribute must stand as an attribute name
// (followed by =, a space, > or /, or quoted as a key in a spread object).
function inMarkup(token) {
  const page = token.match(/^\.ui-page-(.+)$/)?.[1];
  if (page) return new RegExp(`\\b(?:current|pageClass)=["']${escape(page)}["']`).test(markup);
  const name = bare(token);
  if (token.startsWith("#")) return new RegExp(`\\bid=(?:["']${escape(name)}["']|\\{[^}]*["'\`]${escape(name)}["'\`][^}]*\\})`).test(markup);
  if (token.startsWith(".")) return word(name).test(classText);
  return new RegExp(`(?<![\\w-])${escape(name)}(?=[\\s=>/]|["']\\s*:)`).test(markup);
}
// A data attribute also counts in its dataset form (data-focus-fx as dataset.focusFx).
function inScript(text, token) {
  if (word(bare(token)).test(text)) return true;
  if (!token.startsWith("[data-")) return false;
  const camel = bare(token).slice(5).replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  return new RegExp(`\\.dataset\\??\\.${escape(camel)}\\b|\\.dataset\\[\\s*['"]${escape(camel)}['"]`).test(text);
}

const sourceCache = new Map();
const source = (file) => sourceCache.get(file) ?? sourceCache.set(file, read(file)).get(file);
const createdTokens = new Set(Object.values(scripts).flatMap(({ created }) => created.flatMap(selectorTokens)));
const unsourcedTokens = new Set(Object.values(unsourced).flat());
const changingEntry = (file, token) => changing.find((entry) => entry.file === file && entry.tokens.includes(token));

test("every script in the hook table exists", () => {
  const files = [...Object.keys(scripts), ...builtSelectors.map(({ file }) => file), ...changing.map(({ file }) => file)];
  assert.deepEqual(files.filter((file) => !exists(file)), []);
});

for (const [file, { queried, created }] of Object.entries(scripts)) {
  test(`${file}: queried hooks are still queried and still provided`, () => {
    const problems = [];
    for (const selector of queried) {
      for (const token of selectorTokens(selector)) {
        if (changingEntry(file, token)) continue;
        if (!inScript(source(file), token)) problems.push(`${token} (from ${selector}) is no longer in ${file}`);
        if (!inMarkup(token) && !createdTokens.has(token) && !unsourcedTokens.has(token)) problems.push(`${token} (from ${selector}) comes from no markup source and no script creates it`);
      }
    }
    assert.deepEqual(problems, []);
  });

  if (created.length) {
    test(`${file}: created hooks are still created`, () => {
      const missing = created.flatMap(selectorTokens).filter((token) => !changingEntry(file, token) && !inScript(source(file), token));
      assert.deepEqual(missing, [], `${file} no longer writes these hooks`);
    });
  }
}

for (const { file, prefix, names, composed = [] } of builtSelectors) {
  test(`${file}: selectors built from ${prefix === "#" ? "#" : `[${prefix}`}… still name their hooks`, () => {
    const text = source(file);
    assert.ok(text.includes(prefix), `${file} no longer builds selectors from ${prefix}`);
    assert.deepEqual(names.filter((name) => !text.includes(`'${name}'`) && !text.includes(`"${name}"`)), [], `${file} no longer asks for these names`);
    assert.deepEqual([...names, ...composed].map((name) => builtToken(prefix, name)).filter((token) => !inMarkup(token) && !createdTokens.has(token) && !unsourcedTokens.has(token)), [], "built selectors without markup");
  });
}

test("every exemption in unsourced is still queried by some script", () => {
  const queriedTokens = new Set([
    ...Object.values(scripts).flatMap(({ queried }) => queried.flatMap(selectorTokens)),
    ...builtSelectors.flatMap(({ prefix, names }) => names.map((name) => builtToken(prefix, name)))
  ]);
  assert.deepEqual([...unsourcedTokens].filter((token) => !queriedTokens.has(token)), []);
});

for (const { file, tokens, owner, why } of changing) {
  for (const token of tokens) {
    const present = exists(file) && inScript(source(file), token);
    test(`${file}: ${token} stays until ${owner} (${why})`, present ? {} : pendingTest(owner, `${token} left ${file}: ${why}; remove it from changing in scripts/lib/js-hooks.mjs`), () => {
      assert.ok(present, `${token} is no longer in ${file}`);
    });
  }
}

// Completeness: a hook a script looks up through a literal selector and the table does not hold would not be guarded
// against a rename. Every behaviour script is scanned (public/assets/js and src/scripts, tests excepted).
test("the table holds every hook the scripts look up through a literal selector", () => {
  const files = [...walk(abs("public/assets/js")), ...walk(abs("src/scripts"))]
    .filter((file) => /\.m?js$/.test(file) && !/\.test\.m?js$/.test(file))
    .map((file) => path.relative(abs("."), file).split(path.sep).join("/"));
  const missing = [];
  for (const file of files) {
    const entry = scripts[file] || { queried: [], created: [] };
    const known = new Set([...entry.queried, ...entry.created].flatMap(selectorTokens));
    for (const { prefix, names, composed = [] } of builtSelectors.filter((built) => built.file === file)) {
      for (const name of [...names, ...composed]) known.add(builtToken(prefix, name));
    }
    for (const token of new Set(scanQueries(source(file)).flatMap(selectorTokens))) if (!known.has(token)) missing.push(`${file}: ${token}`);
  }
  assert.deepEqual(missing, [], "add these to scripts (queried) in scripts/lib/js-hooks.mjs");
});
