// The rules of the CSS lint (spec §2.4, §2.9), kept apart from scripts/audit-css.mjs so scripts/audit-css.test.mjs
// can hold them to known selectors: the specificity weight of a selector, nested rules, the bans, the !important
// count, theme selectors and the pinned file headers.

import { cssRules } from "./css-rules.mjs";

export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Splits on top-level separators: commas inside :is() and friends, and characters inside [...], stay.
function splitTop(text, isSeparator) {
  const parts = [];
  let depth = 0, current = "";
  for (const char of text) {
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (depth === 0 && isSeparator(char)) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// The weight of one compound selector: its classes, attributes and pseudo-classes, each :is(), :not() and :has()
// adding the weight of its heaviest argument (two :not() add two arguments, as in CSS specificity), :where() and
// pseudo-elements adding nothing; and the ids outside :where().
function weighCompound(compound) {
  let count = 0, ids = 0;
  for (let index = 0; index < compound.length;) {
    const char = compound[index];
    if (char === "[") {
      count += 1;
      index = compound.indexOf("]", index) + 1 || compound.length;
    } else if (char === "." || char === "#") {
      if (char === ".") count += 1;
      else ids += 1;
      index += 1;
      while (index < compound.length && /[\w-]/.test(compound[index])) index += 1;
    } else if (char === ":") {
      const element = compound[index + 1] === ":";
      index += element ? 2 : 1;
      const start = index;
      while (index < compound.length && /[\w-]/.test(compound[index])) index += 1;
      const name = compound.slice(start, index).toLowerCase();
      let argument = null;
      if (compound[index] === "(") {
        let depth = 0, end = index;
        for (; end < compound.length; end++) {
          if (compound[end] === "(") depth += 1;
          if (compound[end] === ")" && --depth === 0) break;
        }
        argument = compound.slice(index + 1, end);
        index = end + 1;
      }
      if (element || name === "where") continue;
      if (["is", "not", "has", "matches"].includes(name) && argument !== null) {
        const weights = splitTop(argument, (c) => c === ",").map(weighComplex);
        count += Math.max(0, ...weights.map((weight) => weight.count));
        ids += weights.reduce((sum, weight) => sum + weight.ids, 0);
      } else {
        count += 1;
      }
    } else {
      index += 1;
    }
  }
  return { count, ids, worst: count };
}

// { count, ids, worst }: count over the whole selector, worst the heaviest single compound.
export function weighComplex(selector) {
  const weights = splitTop(selector, (char) => /[\s>+~]/.test(char)).map(weighCompound);
  return {
    count: weights.reduce((sum, weight) => sum + weight.count, 0),
    ids: weights.reduce((sum, weight) => sum + weight.ids, 0),
    worst: Math.max(0, ...weights.map((weight) => weight.worst))
  };
}

// The architecture is flat: a style rule never holds another rule, and no selector uses the nesting selector &. Both
// would let a compound escape the limit, because the parts are weighed apart. Returns the offending preludes.
export function nestedRules(css) {
  const text = stripComments(css);
  const stack = [];
  const found = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "{") {
      const prelude = text.slice(start, index).split(";").pop().replace(/\s+/g, " ").trim();
      if (stack.some((entry) => !entry.startsWith("@")) || (!prelude.startsWith("@") && prelude.includes("&"))) found.push(prelude);
      stack.push(prelude);
      start = index + 1;
    } else if (char === "}") {
      stack.pop();
      start = index + 1;
    }
  }
  return found;
}

// Text bans, case-insensitive as CSS keywords are: no cascade layers, imports, off-site resources (in url(),
// image-set() or any quoted string) or body ids.
export const bans = [
  [/@layer\b/i, "@layer"],
  [/@import\b/i, "@import"],
  [/url\(\s*["']?\s*(?:https?:)?\/\//i, "a remote url()"],
  [/["']\s*(?:https?:)?\/\/[^\s"'/]/i, "a remote address in a string (image-set() or src)"],
  [/body#/i, "body#"]
];

// Live blur only where Microsoft Edge rendered it on the old site (census of 2f20d7e, effects pass of 2026-11-18): the
// CV education date chips. Everywhere else glass is a translucent face without blur. Keyed by the file under
// src/styles/folio; a rule may use backdrop-filter only when every one of its selectors is listed for its file.
export const blurAllowList = {
  "pages/cv.css": [".ui-page-cv .cv-edu-card > .ledger__key"]
};

// The selectors of every rule in `file` that declares backdrop-filter (with or without a prefix) outside the list.
export function blurOutsideAllowList(file, css) {
  const allowed = blurAllowList[file] || [];
  return cssRules(css)
    .filter((rule) => rule.declarations.some((declaration) => /(^|-)backdrop-filter$/.test(declaration.property)))
    .flatMap((rule) => rule.selectors.filter((selector) => !allowed.includes(selector)));
}

export const countImportant =(css) => (stripComments(css).match(/!\s*important/gi) || []).length;
export const namesThemeSelector = (css) => /\[\s*data-theme/i.test(stripComments(css));

// The file headers, pinned (spec §7.3 freezes them): owner, budget in KB and @important per manifest file. A package
// that needs a larger budget asks for it in its handoff; the integration pass changes the header and this table.
export const pinnedHeaders = {
  "00-tokens.css": ["WP1", 31, 0],
  "01-fonts.css": ["WP1", 3, 0],
  "02-reset.css": ["WP1", 3, 1],
  "03-base.css": ["WP1", 11.5, 0],
  "04-layout.css": ["WP1", 5, 0],
  "05-utilities.css": ["WP1", 2, 10],
  "components/button.css": ["WP1", 4, 0],
  "components/marker.css": ["WP1", 3.5, 0],
  "components/evidence-status.css": ["WP1", 2, 0],
  "components/masthead.css": ["WP1", 6.5, 0],
  "components/plate.css": ["WP1", 5, 0],
  "components/ledger.css": ["WP1", 3, 0],
  "components/table.css": ["WP1", 2, 0],
  "components/disclosure.css": ["WP1", 2, 0],
  "components/form.css": ["WP1", 3, 0],
  "components/frames.css": ["WP1", 8, 0],
  "components/header.css": ["WP2", 18, 0],
  "components/footer.css": ["WP2", 6, 0],
  "components/continue-reading.css": ["WP2", 3, 0],
  "components/fx-dock.css": ["WP2", 11, 0],
  "components/backdrop.css": ["WP2", 9, 0],
  "components/ambient.css": ["WP2", 5, 0],
  "components/interface-2046.css": ["WP2", 11, 0],
  "components/mineral-fx.css": ["WP2", 3.5, 0],
  "components/arrival.css": ["WP2", 7, 0],
  "components/research-guide.css": ["WP3", 9, 0],
  "components/pathway.css": ["WP3", 9, 0],
  "components/comparison.css": ["WP3", 6, 0],
  "components/image-inspector.css": ["WP4", 5, 0],
  "components/research-scale.css": ["WP4", 5, 0],
  "components/scene.css": ["WP4", 6, 0],
  "components/planetary.css": ["WP4", 21, 0],
  "components/sample-missions.css": ["WP4", 24, 0],
  "components/origins.css": ["WP4", 22, 0],
  "components/presentation.css": ["WP5", 4.5, 0],
  "components/lightbox.css": ["WP6", 7, 0],
  "components/atlas.css": ["WP6", 6, 0],
  "components/mission-log.css": ["WP6", 14, 0],
  "components/surface-light.css": ["WP2", 9, 0],
  "pages/home.css": ["WP3", 14, 0],
  "pages/home-opening.css": ["WP3", 18, 0],
  "pages/research.css": ["WP3", 6.5, 0],
  "pages/research-log.css": ["WP3", 7, 0],
  "pages/ryugu-bennu.css": ["WP4", 2.5, 0],
  "pages/origins.css": ["WP4", 2.5, 0],
  "pages/paper-shelf.css": ["WP5", 18, 0],
  "pages/photography.css": ["WP5", 10.5, 0],
  "pages/cv.css": ["WP5", 7.5, 0],
  "pages/contact.css": ["WP5", 6.5, 0],
  "pages/not-found.css": ["WP5", 6, 0],
  "pages/graduation.css": ["WP6", 5.5, 0],
  "states/overlays.css": ["WP1", 1.5, 0],
  "states/motion.css": ["WP1", 2, 12],
  "states/contrast.css": ["WP1", 2.5, 0],
  "states/print.css": ["WP1", 2, 4]
};
