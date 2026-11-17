// Matchers for the style-contract tables. Each returns { label, test(source, rules) }; scripts/style-contract.test.mjs
// passes the source text and its parsed rules (scripts/lib/css-rules.mjs).
import { hasDeclaration, normaliseSelector } from "../lib/css-rules.mjs";

const compact = (text) => text.replace(/\s+/g, "").toLowerCase();

// A selector matches when it is the target, or ends with it after a descendant or child combinator, so a contract
// row holds for ".obs-nav-beam" whether the stylesheet writes it plainly or under a scoping prefix. The lint allows an
// id only inside :where(), so an id wrapped alone in :where() counts as the id: "#cosmic-arrival:not([open])"
// matches ":where(#cosmic-arrival):not([open])".
const unwrapIds = (selector) => selector.replace(/:where\((#[\w-]+)\)/g, "$1");
function selectorMatches(selector, target) {
  if (target instanceof RegExp) return target.test(selector) || target.test(unwrapIds(selector));
  const want = normaliseSelector(target);
  return [selector, unwrapIds(selector)].some((candidate) => candidate === want || candidate.endsWith(` ${want}`));
}

// Some rule (or several rules with the same selector, taken together) under the given conditions carries every
// declaration. Options: { media } — a string every matching rule's at-rule conditions must contain (spaces ignored),
// or null for rules outside any at-rule.
export function rule(target, ...declarations) {
  const options = typeof declarations.at(-1) === "object" ? declarations.pop() : {};
  const label = `${target}${options.media === undefined ? "" : options.media === null ? " (top level)" : ` within ${options.media}`} { ${declarations.join("; ")} }`;
  return {
    label,
    test(_source, rules) {
      const candidates = rules.filter((entry) => {
        if (options.media === null && entry.conditions.length) return false;
        if (typeof options.media === "string" && !entry.conditions.some((condition) => compact(condition).includes(compact(options.media)))) return false;
        if (entry.conditions.some((condition) => condition.startsWith("@keyframes"))) return false;
        return entry.selectors.some((selector) => selectorMatches(selector, target));
      });
      if (!candidates.length) return false;
      return declarations.every((declaration) => candidates.some((entry) => hasDeclaration(entry, declaration)));
    }
  };
}

// The raw text contains the string, or matches the pattern.
export function text(pattern) {
  return {
    label: String(pattern),
    test: (source) => (pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern))
  };
}
