import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { stylesheets } from "../data/site";

type Bundle = { css: string; version: string };

// The stylesheet tree. Every .css file in it must be listed in the manifest, and every listed file must exist.
const stylesDir = "src/styles/folio";

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

// The manifest and the tree must agree in both directions, so a new file cannot be left out of the cascade and a
// renamed one cannot silently drop its rules.
function checkManifest(root: string) {
  const listed: readonly string[] = stylesheets;
  const onDisk = fs
    .readdirSync(path.join(root, stylesDir), { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".css"))
    .map((file) => `${stylesDir}/${file.split(path.sep).join("/")}`);
  const problems = [
    ...listed.filter((file, index) => listed.indexOf(file) !== index).map((file) => `${file} is listed twice`),
    ...listed.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `${file} is listed but does not exist`),
    ...onDisk.filter((file) => !listed.includes(file)).map((file) => `${file} is not listed, so no page would load it`)
  ];
  if (problems.length) throw new Error(`Stylesheet manifest (stylesheets in src/data/site.ts):\n- ${problems.join("\n- ")}`);
}

async function build(): Promise<Bundle> {
  const root = process.cwd();
  checkManifest(root);
  // Each file behind a /*! path */ marker, which the minifier keeps, in cascade order.
  const source = stylesheets
    .map((file) => `/*! ${file} */\n${fs.readFileSync(path.join(root, file), "utf8")}\n`)
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
