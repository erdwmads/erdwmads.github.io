// Style contract (spec §6.1, §6.3): the non-visual CSS mechanics that behaviour depends on, one table per area in
// scripts/style-contract/, checked against the bundle source (the manifest's stylesheets concatenated in cascade
// order, scripts/lib/read-bundle-source.mjs), so CI checks them before the build. Each table belongs to the package
// that owns the area. A row marked pending is skipped and named with its owner while that owner is rebuilding the
// area; otherwise, and under FOLIO_STRICT=1, it runs like any other (scripts/lib/pending.mjs).
import assert from "node:assert/strict";
import test from "node:test";
import { cssRules } from "./lib/css-rules.mjs";
import { pendingTest } from "./lib/pending.mjs";
import { readBundleSource } from "./lib/read-bundle-source.mjs";
import { read } from "./lib/site-paths.mjs";

const areaOwners = { core: "WP1", shell: "WP2", research: "WP3", features: "WP4", collections: "WP5", archive: "WP6" };
const bundle = readBundleSource();
const bundleRules = cssRules(bundle);

for (const [area, expectedOwner] of Object.entries(areaOwners)) {
  const { owner, contract } = await import(`./style-contract/${area}.mjs`);

  test(`${area}: the table names its owner and every row says what to check`, () => {
    assert.equal(owner, expectedOwner);
    for (const row of contract) {
      assert.ok(!("legacy" in row), `${area}: the legacy flag was retired with the rebuild (${row.name})`);
      assert.ok(row.name && (row.has?.length || row.lacks?.length || row.check), `${area}: row without a check (${row.name})`);
    }
  });

  for (const row of contract) {
    const options = row.pending ? pendingTest(owner, row.pending) : {};
    test(`${area} (${owner}): ${row.name}`, options, () => {
      const source = row.source ? read(row.source) : bundle;
      const rules = !row.source ? bundleRules : row.source.endsWith(".css") ? cssRules(source) : [];
      for (const matcher of row.has || []) assert.ok(matcher.test(source, rules), `${row.source || "bundle source"}: missing ${matcher.label}`);
      for (const matcher of row.lacks || []) assert.ok(!matcher.test(source, rules), `${row.source || "bundle source"}: must not have ${matcher.label}`);
      row.check?.(source, { read, rules });
    });
  }
}
