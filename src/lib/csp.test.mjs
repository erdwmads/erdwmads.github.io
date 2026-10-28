import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attributeValue, contentSecurityPolicy, executableInlineScripts, isExecutableScriptType, isOffOrigin, normalizeInlineScript, pageRequestProblems, parsePolicy, policyDirectives, policyMetas, scriptHash } from "./csp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("inline-script hashes follow the CSP spec and the HTML parser's newline normalisation", () => {
  // The example from the CSP Level 3 specification.
  assert.equal(scriptHash("alert('Hello, world.');"), "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='");
  // A CRLF checkout renders CRLF into the page; the browser hashes the LF text it parsed.
  assert.equal(normalizeInlineScript("a\r\nb\rc\n"), "a\nb\nc\n");
  assert.equal(scriptHash("a();\r\nb();\r\n"), scriptHash("a();\nb();\n"));
  assert.notEqual(scriptHash("a();"), scriptHash(" a();"), "whitespace is part of the hashed text");
});

test("the policy keeps every request on this origin and allows inline scripts only by hash", () => {
  const scripts = ["one();", "two();", "one();"];
  const directives = parsePolicy(contentSecurityPolicy(scripts));
  assert.deepEqual([...directives.keys()], policyDirectives.map(([name]) => name));
  assert.deepEqual(directives.get("default-src"), ["'self'"]);
  assert.deepEqual(directives.get("connect-src"), ["'self'"]);
  assert.deepEqual(directives.get("font-src"), ["'self'"]);
  assert.deepEqual(directives.get("img-src"), ["'self'", "data:", "blob:"]);
  assert.deepEqual(directives.get("worker-src"), ["'self'", "blob:"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("base-uri"), ["'self'"]);
  assert.deepEqual(directives.get("form-action"), ["'self'"]);
  assert.deepEqual(directives.get("style-src"), ["'self'", "'unsafe-inline'"]);
  // 'wasm-unsafe-eval' lets the Draco decoder compile WebAssembly; it does not allow eval() or new Function().
  assert.deepEqual(directives.get("script-src"), ["'self'", "'wasm-unsafe-eval'", scriptHash("one();"), scriptHash("two();")]);
  for (const [name, sources] of directives) {
    assert.ok(!sources.includes("'unsafe-inline'") || name === "style-src", `${name} must not allow unsafe-inline`);
    assert.ok(!sources.includes("'unsafe-eval'"), `${name} must not allow unsafe-eval`);
    assert.ok(!sources.some((source) => /^(?:https?:|\*|\/\/)/.test(source)), `${name} must not list another origin`);
    if (name !== "script-src") assert.ok(!sources.some((source) => source.startsWith("'sha256-")), `hashes belong in script-src only, not ${name}`);
  }
});

test("only script types the browser runs count as executable", () => {
  for (const type of ["", "module", "text/javascript", "application/javascript", "TEXT/JAVASCRIPT; charset=utf-8", "importmap"]) assert.equal(isExecutableScriptType(type), true, type);
  for (const type of ["application/ld+json", "application/json", "text/plain", "text/template"]) assert.equal(isExecutableScriptType(type), false, type);
});

test("every executable inline script in the components is rendered from the hashed strings", () => {
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
  const allowed = /^<script is:inline(?: data-[a-z-]+)? set:html=\{(?:inlineScripts\.[a-zA-Z]+|siteHeaderSource)\}><\/script>$/;
  let executable = 0;
  for (const file of walk("src").filter((name) => name.endsWith(".astro"))) {
    for (const match of read(file).matchAll(/<script\b[^>]*\bis:inline\b[^>]*?\/>|<script\b[^>]*\bis:inline\b[^>]*>[\s\S]*?<\/script>/g)) {
      const tag = match[0];
      if (/type="application\/ld\+json"/.test(tag)) continue;
      executable += 1;
      assert.match(tag, allowed, `${file}: inline script must be rendered with set:html from src/lib/inline-scripts.ts: ${tag.slice(0, 120)}`);
    }
  }
  assert.equal(executable, 4, "theme preload, header controller, entrance opener and the Research forwarder");
  const registry = read("src/lib/inline-scripts.ts");
  for (const file of fs.readdirSync(path.join(root, "src/scripts/inline"))) {
    assert.ok(registry.includes(`../scripts/inline/${file}?raw`), `src/lib/inline-scripts.ts must hash src/scripts/inline/${file}`);
  }
  assert.ok(registry.includes("../../public/assets/js/site-header.js?raw"), "the inline header controller is hashed from the file LegacyShell renders");
  assert.match(read("src/components/LegacyShell.astro"), /import siteHeaderSource from "\.\.\/\.\.\/public\/assets\/js\/site-header\.js\?raw";/);
});

test("the policy meta comes first in every page head", () => {
  const shell = read("src/components/LegacyShell.astro");
  const head = shell.slice(shell.indexOf("<head>"), shell.indexOf("</head>"));
  assert.ok(head.indexOf('<meta http-equiv="Content-Security-Policy" content={contentSecurityPolicy}>') >= 0);
  assert.ok(head.indexOf("http-equiv=\"Content-Security-Policy\"") < head.indexOf("<script"), "a meta policy governs only what follows it");
  const stub = read("src/pages/sample-cabinet.astro");
  assert.ok(stub.includes('<meta http-equiv="Content-Security-Policy" content={contentSecurityPolicy}>'), "the Sample Cabinet stub has its own head");
});

test("the page scanner finds the policy meta and the inline scripts the browser would run", () => {
  const html = `<head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;; object-src &#39;none&#39;">`
    + `<script>one();</script><script type="application/ld+json">{"a":1}</script><script type="module" src="a.js"></script>`
    + `<script type="module">two();</script></head>`;
  const metas = policyMetas(html);
  assert.equal(metas.length, 1);
  assert.equal(metas[0].content, "default-src 'self'; object-src 'none'");
  assert.ok(metas[0].index < html.indexOf("<script"));
  assert.deepEqual(executableInlineScripts(html).map(({ hash }) => hash), [scriptHash("one();"), scriptHash("two();")]);
});

test("the external-request guard flags off-origin fetches but not plain links or same-origin URLs", () => {
  const site = "https://erdwmads.github.io";
  const found = (html) => pageRequestProblems(html, site).map(({ kind, tag, url }) => [kind, tag, url ?? ""].join(" "));
  // Off-origin: scripts, stylesheets, images (also srcset), frames, media and CSS url().
  assert.deepEqual(found(`<script src="https://cdn.example.com/x.js"></script>`), ["external <script src> https://cdn.example.com/x.js"]);
  assert.deepEqual(found(`<link rel="stylesheet" href="//fonts.example.com/a.css">`), ["external <link href> //fonts.example.com/a.css"]);
  assert.deepEqual(found(`<img src="a.webp" srcset="a.webp 1x, http://img.example.com/b.webp 2x">`), ["external <img srcset> http://img.example.com/b.webp"]);
  assert.deepEqual(found(`<iframe src="https://www.youtube.com/embed/x"></iframe>`), ["external <iframe src> https://www.youtube.com/embed/x"]);
  assert.deepEqual(found(`<video poster="https://x.example/p.jpg"><source src="https://x.example/v.mp4"></video><audio src="https://x.example/a.mp3"></audio>`),
    ["external <video poster> https://x.example/p.jpg", "external <source src> https://x.example/v.mp4", "external <audio src> https://x.example/a.mp3"]);
  assert.deepEqual(found(`<div style="background:url('https://x.example/bg.png')"></div>`), ["external CSS url() https://x.example/bg.png"]);
  assert.deepEqual(found(`<style>@import "https://x.example/a.css";</style>`), ["external CSS url() https://x.example/a.css"]);
  // A data: script is off-origin for script-src; data: images are allowed by img-src.
  assert.deepEqual(found(`<script src="data:text/javascript,alert(1)"></script>`), ["external <script src> data:text/javascript,alert(1)"]);
  assert.deepEqual(found(`<img src="data:image/png;base64,AAAA"><div style="background:url(data:image/svg+xml,%3Csvg%3E)"></div>`), []);
  // Same origin, relative URLs, plain links and non-fetching link relations pass.
  assert.deepEqual(found(`<script src="assets/js/a.js"></script><link rel="stylesheet" href="/_astro/a.css"><img src="https://erdwmads.github.io/assets/img/a.webp">`
    + `<a href="https://orcid.org/0000-0000">ORCID</a><link rel="canonical" href="https://erdwmads.github.io/cv.html"><meta property="og:image" content="https://example.com/x.jpg">`), []);
  // Text inside scripts and templates is not markup.
  assert.deepEqual(found(`<script>const s = '<img src="https://x.example/a.png">';</script><template><img src="https://x.example/b.png"></template>`), []);
});

test("the guard flags markup the policy would block", () => {
  const kinds = (html) => pageRequestProblems(html, "https://erdwmads.github.io").map(({ kind }) => kind);
  assert.deepEqual(kinds(`<button onclick="go()">Go</button>`), ["inline-handler"]);
  assert.deepEqual(kinds(`<a href="javascript:void(0)">x</a>`), ["javascript-url"]);
  assert.deepEqual(kinds(`<button data-onclick="x" aria-label="on">Go</button>`), []);
});

test("off-origin detection", () => {
  const site = "https://erdwmads.github.io";
  for (const url of ["assets/a.js", "/a.js", "./a.js", "#top", "", "https://erdwmads.github.io/a.js"]) assert.equal(isOffOrigin(url, site), false, url);
  for (const url of ["https://example.com/a.js", "//example.com/a.js", "http://erdwmads.github.io/a.js", "data:text/javascript,1", "blob:https://example.com/x"]) assert.equal(isOffOrigin(url, site), true, url);
  assert.equal(isOffOrigin("data:image/png;base64,AAAA", site, true), false);
  assert.equal(attributeValue(` content="a &amp; b" data-x='y'`, "content"), "a & b");
  assert.equal(attributeValue(` data-x=bare`, "data-x"), "bare");
  assert.equal(attributeValue(` data-content="z"`, "content"), null);
});
