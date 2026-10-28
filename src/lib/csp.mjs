// Content Security Policy for every page. GitHub Pages cannot set response headers, so pages carry it as
// <meta http-equiv="Content-Security-Policy"> (LegacyShell.astro and the Sample Cabinet stub). A meta policy
// cannot set frame-ancestors, report-uri or sandbox, and it cannot stop navigation; it keeps the site free of
// third-party requests and stops an injected script from running or sending decrypted Mission Log text away.
// Plain JavaScript so scripts/check-site.mjs and the tests share it with the build (src/lib/inline-scripts.ts).
import { createHash } from "node:crypto";

// The HTML parser turns CRLF and lone CR into LF before the browser hashes an inline script, so hash that text.
export function normalizeInlineScript(code) {
  return String(code).replace(/\r\n?/g, "\n");
}

export function scriptHash(code) {
  return `'sha256-${createHash("sha256").update(normalizeInlineScript(code), "utf8").digest("base64")}'`;
}

// Everything comes from this origin. Inline scripts are allowed only by hash (added to script-src), never by
// 'unsafe-inline'. Styles keep 'unsafe-inline' because the pages and scripts use style attributes.
// 'wasm-unsafe-eval' and worker-src blob: are for the Draco decoder of the OSIRIS-REx model on Ryugu & Bennu:
// three.js starts it as a blob: worker that compiles WebAssembly (without them the spacecraft never loads).
// img-src data: blob: covers CSS data URIs, canvas snapshots and textures that GLTFLoader unpacks from GLB files.
export const policyDirectives = Object.freeze([
  ["default-src", "'self'"],
  ["script-src", "'self'", "'wasm-unsafe-eval'"],
  ["style-src", "'self'", "'unsafe-inline'"],
  ["img-src", "'self'", "data:", "blob:"],
  ["font-src", "'self'"],
  ["connect-src", "'self'"],
  ["worker-src", "'self'", "blob:"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"]
]);

export function contentSecurityPolicy(inlineScripts = []) {
  const hashes = [...new Set(inlineScripts.map(scriptHash))];
  return policyDirectives
    .map(([name, ...sources]) => [name, ...sources, ...(name === "script-src" ? hashes : [])].join(" "))
    .join("; ");
}

// Directive name -> source list, for checks and tests.
export function parsePolicy(policy) {
  return new Map(String(policy).split(";").map((part) => part.trim().split(/\s+/)).filter((tokens) => tokens[0]).map(([name, ...sources]) => [name.toLowerCase(), sources]));
}

// Script types the browser executes (and CSP therefore governs). JSON-LD and other data blocks do not run.
const javaScriptTypes = /^(?:application\/(?:x-)?(?:ecma|java)script|text\/(?:(?:x-)?(?:ecma|java)script|javascript1\.[0-5]|jscript|livescript))$/;
export function isExecutableScriptType(type = "") {
  const essence = String(type).split(";")[0].trim().toLowerCase();
  return !essence || essence === "module" || essence === "importmap" || essence === "speculationrules" || javaScriptTypes.test(essence);
}

// Generated-page checks for scripts/check-site.mjs: a small tag scanner for the HTML Astro writes, not a full parser.
const decodeAttribute = (value) => value
  .replace(/&#(?:39|x27);|&apos;/gi, "'").replace(/&#(?:34|x22);|&quot;/gi, '"')
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");

export function attributeValue(attrs, name) {
  const match = String(attrs).match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return match ? decodeAttribute(match[1] ?? match[2] ?? match[3] ?? "") : null;
}

// Relative and same-origin URLs stay on this site; data: counts as off-origin unless allowed (img-src allows it).
export function isOffOrigin(value, siteOrigin, allowData = false) {
  const url = String(value).trim();
  if (!url || url.startsWith("#")) return false;
  if (/^data:/i.test(url)) return !allowData;
  if (!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return false;
  try { return new URL(url, `${siteOrigin}/`).origin !== new URL(siteOrigin).origin; } catch { return true; }
}

// The policy metas of a page, with their offsets (a meta policy governs only what follows it).
export function policyMetas(html) {
  return [...String(html).matchAll(/<meta\b[^>]*\bhttp-equiv\s*=\s*["']?content-security-policy\b[^>]*>/gi)]
    .map((match) => ({ index: match.index, content: attributeValue(match[0].slice(5, -1), "content") || "" }));
}

// Inline scripts the browser runs, with the hash CSP compares (scripts with src or a data type are left out).
export function executableInlineScripts(html) {
  return [...String(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attrs]) => attributeValue(attrs, "src") === null && isExecutableScriptType(attributeValue(attrs, "type") || ""))
    .map(([, attrs, code]) => ({ tag: `<script${attrs}>`, hash: scriptHash(code) }));
}

// Off-origin url() and @import in CSS text (a stylesheet, a <style> block or a style attribute).
export function externalCssUrls(text, siteOrigin) {
  const urls = [];
  for (const match of String(text).matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) urls.push(match[1] ?? match[2] ?? match[3] ?? "");
  for (const match of String(text).matchAll(/@import\s+(?:"([^"]*)"|'([^']*)')/gi)) urls.push(match[1] ?? match[2] ?? "");
  return urls.filter((url) => isOffOrigin(url, siteOrigin, true));
}

// Tags that make the browser fetch something, and the attributes it fetches.
const requestAttributes = {
  script: ["src"], img: ["src", "srcset"], iframe: ["src"], frame: ["src"], source: ["src", "srcset"], video: ["src", "poster"],
  audio: ["src"], track: ["src"], embed: ["src"], object: ["data"], input: ["src"]
};
const imageAttributes = new Set(["img:src", "img:srcset", "source:srcset", "video:poster", "input:src"]);
const requestLinkRels = new Set(["stylesheet", "preload", "modulepreload", "prefetch", "preconnect", "dns-prefetch", "icon", "apple-touch-icon", "manifest", "mask-icon"]);
const srcsetUrls = (value) => (/^\s*data:/i.test(value) ? [value] : value.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean));

// Everything in a generated page that the policy would block or that would fetch from another origin:
// [{ kind: "external" | "inline-handler" | "javascript-url", tag, attribute?, url? }]. Plain links (<a href>) are not requests.
export function pageRequestProblems(html, siteOrigin) {
  const problems = [];
  // Markup only: script, style and template contents are not tags.
  const markup = String(html).replace(/<(script|style|template)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, "<$1$2>");
  for (const match of markup.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const [tag, rawName, attrs] = match;
    const name = rawName.toLowerCase();
    if (/\son[a-z]+\s*=/i.test(attrs)) problems.push({ kind: "inline-handler", tag });
    for (const attribute of ["href", "src", "action", "formaction"]) {
      if (/^\s*javascript:/i.test(attributeValue(attrs, attribute) || "")) problems.push({ kind: "javascript-url", tag, attribute });
    }
    const fetched = name === "link"
      ? ((attributeValue(attrs, "rel") || "").toLowerCase().split(/\s+/).some((rel) => requestLinkRels.has(rel)) ? ["href", "imagesrcset"] : [])
      : requestAttributes[name] || [];
    for (const attribute of fetched) {
      const value = attributeValue(attrs, attribute);
      if (value === null) continue;
      const urls = attribute.endsWith("srcset") ? srcsetUrls(value) : [value];
      for (const url of urls.filter((url) => isOffOrigin(url, siteOrigin, imageAttributes.has(`${name}:${attribute}`)))) {
        problems.push({ kind: "external", tag: `<${name} ${attribute}>`, attribute, url });
      }
    }
  }
  for (const url of externalCssUrls(html, siteOrigin)) problems.push({ kind: "external", tag: "CSS url()", url });
  return problems;
}
