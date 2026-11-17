// Playwright and Edge for the browser tools that run on their own (perf-probe.mjs, the standalone style snapshot),
// found the way run-browser-tests.mjs finds them: PLAYWRIGHT_MODULE (a playwright package directory), else the
// package installed here; EDGE_EXECUTABLE, else Edge in its standard Windows location, else Playwright's Chromium.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { root } from "./site-paths.mjs";

const edgeCandidates = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"];
export const edgeExecutable = process.env.EDGE_EXECUTABLE || edgeCandidates.find((candidate) => fs.existsSync(candidate)) || "";

export function loadPlaywright() {
  const require = createRequire(path.join(root, "package.json"));
  return require(process.env.PLAYWRIGHT_MODULE || "playwright");
}

export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  return chromium.launch({ headless: true, ...(edgeExecutable ? { executablePath: edgeExecutable } : {}) });
}
