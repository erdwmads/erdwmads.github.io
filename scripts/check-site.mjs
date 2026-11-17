// Checks the built site in dist/ and the sources behind it (npm run check:site, after the build and the PPT export).
// The checks live in scripts/check-site/, one module per area, each owned by one work package of the Folio 2046
// rebuild (spec §6.1): core and styles (WP1), shell (WP2), research (WP3), features (WP4), collections (WP5) and
// archive (WP6). Every module receives the same context (check-site/context.mjs) and reports through fail(), or
// through pending() while its owner has not rebuilt the area yet (scripts/lib/pending.mjs).
import { createContext } from "./check-site/context.mjs";
import { reportPending } from "./lib/pending.mjs";

const modules = ["core", "styles", "shell", "research", "features", "collections", "archive"];
const context = createContext();
const { failures, fail, pages } = context;

for (const name of modules) {
  const { default: check } = await import(`./check-site/${name}.mjs`);
  try {
    await check(context);
  } catch (error) {
    fail(`check-site/${name}.mjs stopped early: ${error.message}`);
  }
}

const pendingFails = reportPending();
if (failures.length) {
  console.error("Site check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
if (pendingFails) process.exit(1);

console.log(`Site check passed: ${pages.length} public pages, protected Mission Log, local assets, SEO metadata, and Paper Shelf.`);
