// Shared state for the check-site modules: the paths, the public page list, the failure list and the helpers every
// module uses. scripts/check-site.mjs creates one context and passes it to each module in turn.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pending } from "../lib/pending.mjs";

export function createContext() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const distDir = path.join(root, "dist");
  const publicDir = path.join(root, "public");
  const assetsDir = path.join(publicDir, "assets");

  const pages = [
    "index.html",
    "research.html",
    "ryugu-bennu.html",
    "research-graduation.html",
    "research-log.html",
    "paper-shelf.html",
    "cv.html",
    "photography.html",
    "contact.html"
  ];

  const failures = [];

  function fail(message) {
    failures.push(message);
  }

  function readDistPage(file) {
    const pagePath = path.join(distDir, file);
    if (!fs.existsSync(pagePath)) {
      fail(`Missing generated page: ${file}`);
      return "";
    }
    return fs.readFileSync(pagePath, "utf8");
  }

  function collectFiles(targetPath) {
    if (!fs.existsSync(targetPath)) return [];
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) return [targetPath];
    if (!stat.isDirectory()) return [];
    return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
      const childPath = path.join(targetPath, entry.name);
      return entry.isDirectory() ? collectFiles(childPath) : [childPath];
    });
  }

  return { root, distDir, publicDir, assetsDir, pages, failures, fail, pending, readDistPage, collectFiles };
}
