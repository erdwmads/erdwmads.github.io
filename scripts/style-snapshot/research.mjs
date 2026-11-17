// Style snapshot, research area (owner WP3): the pages it is recorded on and the selectors whose computed styles
// scripts/style-snapshot.browser.test.mjs records: the Home title page and Current Focus, the contents bar, the
// Analytical Pathway (full and compact), the comparison table, the key to the marks and the Research Log accession
// record (spec §6.3). The baseline is docs/style-snapshot/research.json. The contents bar is recorded on Research
// only: on Ryugu & Bennu its width follows WP4's page container, which the features area records.
export const owner = "WP3";
export const pages = ["index.html", "research.html", "research-log.html"];
export const selectors = [
  ".home-title", ".home-question", ".home-portrait .figure__media", ".affiliation-emblem", ".home-keywords",
  ".focus-summary", ".focus-list", ".home-explore-list > li", ".home-timeline-list > li",
  ".research-guide", ".research-guide a", ".research-question > h2", ".research-subquestions > li", ".research-scope",
  ".analytical-pathway", ".pathway-item", ".pathway-chip", ".marks-key dl > div", ".comparison-table", ".comparison-table__title",
  ".log-record", ".log-facts", ".log-parts > div"
];
