// The colophon's revision date (src/lib/revision.ts): the last commit's date, an explicit override, and a clear
// build error instead of a wrong date.
import assert from "node:assert/strict";
import test from "node:test";
import { readRevisionDate } from "../src/lib/revision.ts";

test("the revision date is the date of the last commit, read at build time", () => {
  assert.equal(readRevisionDate({}, () => "2026-11-05\n"), "2026-11-05");
  assert.match(readRevisionDate({}), /^\d{4}-\d{2}-\d{2}$/, "this checkout has a HEAD commit");
});

test("REVISION_DATE overrides git and must be an ISO date", () => {
  assert.equal(readRevisionDate({ REVISION_DATE: "2026-10-31" }, () => { throw new Error("git must not run"); }), "2026-10-31");
  assert.throws(() => readRevisionDate({ REVISION_DATE: "31 Oct 2026" }), /REVISION_DATE must be a date in the form YYYY-MM-DD/);
});

test("without git history or an override the build stops with a clear message", () => {
  const noGit = () => { throw new Error("not a git repository"); };
  assert.throws(() => readRevisionDate({}, noGit), /Cannot read the revision date[\s\S]*REVISION_DATE=YYYY-MM-DD/);
  assert.throws(() => readRevisionDate({}, () => ""), /Cannot read the revision date/);
});
