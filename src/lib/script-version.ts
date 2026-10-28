import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const cache = new Map<string, string>();

// Content hash of a file under public/ (for example "assets/js/theme.js"): the first 10 hex characters
// of its sha256, as stylesheet-bundle.ts does for the CSS bundle. A changed script gets a new ?v= URL
// at build time, so nobody has to hand-edit a version string.
export function contentVersion(publicPath: string): string {
  const cached = import.meta.env.DEV ? undefined : cache.get(publicPath);
  if (cached) return cached;
  const version = createHash("sha256").update(fs.readFileSync(path.join(process.cwd(), "public", publicPath))).digest("hex").slice(0, 10);
  cache.set(publicPath, version);
  return version;
}
