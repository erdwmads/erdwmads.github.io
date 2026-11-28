// Style snapshot, collections area (owner WP5): the pages it is recorded on and the selectors whose computed styles
// scripts/style-snapshot.browser.test.mjs records: the bibliography, the photo wall and its controls, the CV identity
// and ledgers, the correspondence block and the 404 contents list, as rebuilt (spec §4.6–§4.10). The baseline is
// docs/style-snapshot/collections.json, recorded with --area collections --write.
export const owner = "WP5";
export const pages = ["paper-shelf.html", "photography.html", "cv.html", "contact.html", "404.html"];
export const selectors = [
  ".masthead", ".masthead__lead", ".masthead__meta",
  ".paper-shelf-tools", ".paper-search", ".paper-filter[aria-pressed=\"true\"]", ".paper-filter[aria-pressed=\"false\"]", "[data-paper-count]",
  ".paper-group", ".paper-group-title", ".paper-group-count", ".paper-card", ".paper-year", ".paper-title", ".paper-citation",
  ".paper-summary", ".paper-relevance", ".paper-relevance-label", ".project-tags", ".paper-copy",
  ".obs-photo-tools", ".photo-layout-switch button[aria-pressed=\"true\"]", ".obs-present-launch", ".photo-wall", ".photo-tile", ".photo-camera__setup > h3",
  ".cv-identity-block", ".cv-identity .person-name", ".cv-citation", ".cv-photo", ".cv-edu-card", ".cv-edu-card .ledger__key", ".cv-edu-body > h3", ".cv-edu-body > p", ".cv-list > li",
  ".contact-row", ".contact-email", ".contact-row > h2", "code[data-email-address]", ".contact-actions", ".contact-note",
  ".archive-index", ".archive-index .ledger__detail"
];
