// Pending checks during the Folio 2046 rebuild. WP1 removes the legacy stylesheets before the packages that own
// each area have rebuilt it, so some guards cannot pass yet. A guard owned by a later package reports itself here
// instead of failing, and names its owner (spec §7.2: WP2 shell, WP3 research reading, WP4 Ryugu & Bennu, Origins
// and 3D, WP5 collections, WP6 protected archive and overlays). An entry is tolerated only while its owner is in
// rebuilding below; the integration pass removes each package from that list as it merges, so a leftover entry, or
// one a later change brings back, fails like any other check, with or without FOLIO_STRICT. FOLIO_STRICT=1 makes
// every entry fail now, as a package does for its own area before handoff.
//   check-site area modules:  pending("WP4", "what is pending")  instead of fail(...)
//   unit tests:               test(name, pendingTest("WP4", "what is pending"), fn)
//   browser guards:           scripts/lib/guard.mjs reports findings of these owners as pending (tolerated())
export const owners = ["WP1", "WP2", "WP3", "WP4", "WP5", "WP6"];
export const strict = process.env.FOLIO_STRICT === "1";

// The packages whose areas are still being rebuilt. WP1 is never here: its own entries always fail. Empty since the
// integration pass merged WP2 to WP6, so every entry, skipped test or guard finding fails, in CI too.
export const rebuilding = new Set();

// True when an entry or finding of this owner may print as pending instead of failing.
export const tolerated = (owner) => !strict && rebuilding.has(owner);

const entries = [];

function checkOwner(owner) {
  if (!owners.includes(owner)) throw new Error(`pending: unknown owner ${owner}; use one of ${owners.join(", ")}`);
}

export function pending(owner, what) {
  checkOwner(owner);
  entries.push({ owner, what });
}

export function pendingEntries() {
  return entries.map((entry) => ({ ...entry }));
}

// node:test options for a test that cannot pass until its owner rebuilds the area. Once the owner has left
// rebuilding, or under FOLIO_STRICT=1, the test runs, and fails, like any other.
export function pendingTest(owner, what) {
  checkOwner(owner);
  return tolerated(owner) ? { skip: `pending ${owner}: ${what}` } : {};
}

// Prints every pending entry with its owner. Returns true when the run must fail: in strict mode with entries left,
// or when an entry belongs to an owner that is no longer rebuilding.
export function reportPending(log = console.log) {
  if (!entries.length) return false;
  log(`Pending until their owner rebuilds the area (${entries.length}):`);
  for (const { owner, what } of entries) log(`- [${owner}]${tolerated(owner) ? "" : " FAIL"} ${what}`);
  if (strict) log("FOLIO_STRICT=1: pending entries count as failures.");
  const settled = [...new Set(entries.filter(({ owner }) => !rebuilding.has(owner)).map(({ owner }) => owner))];
  if (settled.length && !strict) log(`${settled.join(", ")} no longer rebuilding (scripts/lib/pending.mjs): their entries count as failures.`);
  return entries.some(({ owner }) => !tolerated(owner));
}
