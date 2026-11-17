// Style snapshot, shell area (owner WP2): the pages it is recorded on and the selectors whose computed styles
// scripts/style-snapshot.browser.test.mjs records: the header bands, the navigation and its resting marker, the gate
// and the theme toggle, the Onward rows and the footer colophon (spec §6.3). Recorded in docs/style-snapshot/shell.json
// with --area shell --write after the diff has been reviewed.
export const owner = "WP2";
export const pages = ["index.html", "research.html", "research-log.html", "paper-shelf.html", "photography.html", "ryugu-bennu.html"];
export const selectors = [
  ".site-header", ".header-inner", ".brand", ".brand > strong", ".nav__links a", ".nav a[aria-current=\"page\"]", ".nav__divider",
  ".nav-log-gate", ".nav-log-gate[aria-current=\"page\"]", ".theme-toggle", ".nav-toggle",
  ".continue-reading", ".continue-reading-label", ".continue-reading a", ".continue-reading-number",
  ".site-footer", ".footer-inner", ".footer-question__label", ".footer-question__text", ".footer-meta", ".footer-colophon", ".orcid-link"
];
