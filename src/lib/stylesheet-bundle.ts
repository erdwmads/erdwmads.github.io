import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { stylesheets } from "../data/site";

type Bundle = { css: string; version: string };

let cached: Promise<Bundle> | undefined;

// esbuild ships with Vite, Astro's bundler. Resolve it through that chain rather than relying on hoisting.
// Load it with Node's own require: under `astro dev`, a dynamic import() of esbuild's CommonJS entry
// would be evaluated by Vite's ES module runner and fail ("module is not defined").
async function loadEsbuild() {
  const fromRoot = createRequire(path.join(process.cwd(), "package.json"));
  const fromAstro = createRequire(fromRoot.resolve("astro/package.json"));
  const fromVite = createRequire(fromAstro.resolve("vite/package.json"));
  return fromVite("esbuild");
}

async function build(): Promise<Bundle> {
  const cssDir = path.join(process.cwd(), "public", "assets", "css");
  const source = stylesheets
    .map((file) => `/*! ${file} */\n${fs.readFileSync(path.join(cssDir, file), "utf8")}\n`)
    .join("");
  const esbuild = await loadEsbuild();
  // Whitespace and comments only: selectors, declarations and rule order stay exactly as written.
  const { code } = await esbuild.transform(source, { loader: "css", minifyWhitespace: true, legalComments: "inline" });
  return { css: code, version: createHash("sha256").update(code).digest("hex").slice(0, 10) };
}

export function stylesheetBundle(): Promise<Bundle> {
  if (import.meta.env.DEV) return build();
  return (cached ??= build());
}
