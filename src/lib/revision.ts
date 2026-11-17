import { execFileSync } from "node:child_process";

// The revision date the colophon prints (spec §3.2): the committer date of HEAD, read with git at build time. CI
// checks out with full history (fetch-depth: 0). REVISION_DATE=YYYY-MM-DD overrides it, for a build outside a git
// checkout. The build stops with a clear message when neither gives a date, rather than printing a wrong one.
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

type Env = Record<string, string | undefined>;

function lastCommitDate() {
  return execFileSync("git", ["log", "-1", "--format=%cs", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

export function readRevisionDate(env: Env = process.env, gitDate: () => string = lastCommitDate): string {
  const override = env.REVISION_DATE?.trim();
  if (override) {
    if (!isoDate.test(override)) throw new Error(`REVISION_DATE must be a date in the form YYYY-MM-DD, not "${override}".`);
    return override;
  }
  let date = "";
  try {
    date = gitDate().trim();
  } catch {
    // Not a git checkout, or git is missing: reported below.
  }
  if (!isoDate.test(date)) {
    throw new Error("Cannot read the revision date: `git log -1 --format=%cs HEAD` gave no date. Build from a git checkout with history, or set REVISION_DATE=YYYY-MM-DD.");
  }
  return date;
}

let cached: string | undefined;

// Read once per build.
export function revisionDate(): string {
  return (cached ??= readRevisionDate());
}
