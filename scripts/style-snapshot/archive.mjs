// Style snapshot, archive area (owner WP6): the pages it is recorded on and the selectors whose computed styles
// scripts/style-snapshot.browser.test.mjs records: the graduation masthead and the sealed panel with its reserved
// passkey block (spec §4.11). The locked page only: the unlocked edition needs the synthetic payload, so its ledger,
// entry and viewer are held by mission-ledger.browser, lightbox-geometry.browser and the style contract. The baseline
// is docs/style-snapshot/archive.json.
export const owner = "WP6";
export const pages = ["research-graduation.html"];
export const selectors = [
  ".ui-page-research-graduation .masthead", ".ui-page-research-graduation .masthead__lead", ".ui-page-research-graduation .masthead .quiet-link",
  ".research-lock-section", ".research-lock-card", ".research-lock-card > .kicker", ".research-lock-card > h2", ".research-lock-form label",
  "[data-research-lock-input]", "[data-research-lock-form] button[type=\"submit\"]", "[data-passkey-controls]", "[data-passkey-status]",
  ".research-passkey-actions", "[data-passkey-setup]", ".research-passkey-help", ".research-passkey-help summary"
];
