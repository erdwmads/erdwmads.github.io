// Every executable inline script on the site. The Content Security Policy allows inline scripts only by hash, so
// each one is rendered from these strings (set:html) and hashed from the same strings at build time: the text
// and its hash cannot drift apart. A new inline script goes here, or it is blocked; check-site fails on any
// inline script whose hash is missing from a page's policy.
import themePreloadSource from "../scripts/inline/theme-preload.js?raw";
import arrivalGateSource from "../scripts/inline/arrival-gate.js?raw";
import researchForwardSource from "../scripts/inline/research-forward.js?raw";
// LegacyShell.astro renders site-header.js from its own ?raw import; the hash covers the same text.
import siteHeaderSource from "../../public/assets/js/site-header.js?raw";
import { contentSecurityPolicy as buildPolicy, normalizeInlineScript } from "./csp.mjs";

export const inlineScripts = {
  // <head>, before the stylesheets (LegacyShell.astro)
  themePreload: normalizeInlineScript(themePreloadSource),
  // after the entrance dialog on every page (CosmicArrival.astro)
  arrivalGate: normalizeInlineScript(arrivalGateSource),
  // research.html only: forwards links from before the September 2026 move (research.astro)
  researchForward: normalizeInlineScript(researchForwardSource),
  // directly after </header> (LegacyShell.astro)
  siteHeader: normalizeInlineScript(siteHeaderSource)
} as const;

// One policy for every page. Soft navigation keeps the meta policy of the page that was loaded first, and it runs
// the next page's inline scripts marked data-page-script again (research.html's forwarder, or one added through
// getPageScripts inlineHtml), so every page must allow all of them.
export const contentSecurityPolicy: string = buildPolicy(Object.values(inlineScripts));
