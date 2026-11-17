// A small reader for stylesheet text, enough for contract tests: it lists every innermost rule with the at-rule
// conditions around it, and compares selectors and declarations with whitespace and case normalised. It is not a
// full CSS parser; strings that contain braces are the one case it misreads, and the site's CSS has none.

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (text) => text.replace(/\s+/g, " ").trim();

// "a , b>c" -> "a, b > c": one space around combinators and after commas, none inside brackets or at the edges of
// parentheses. Characters inside [...] (such as ~= in [data-overflow~=end]) are left alone.
export function normaliseSelector(selector) {
  let out = "", depth = 0;
  for (const char of squash(selector)) {
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    out += depth === 0 && /[>+~,]/.test(char) ? (char === "," ? ", " : ` ${char} `) : char;
  }
  return out
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

// Splits a selector list on its top-level commas (commas inside :is(), :not() and friends stay).
export function splitSelectorList(list) {
  const parts = [];
  let depth = 0, current = "";
  for (const char of list) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) { parts.push(current); current = ""; continue; }
    current += char;
  }
  parts.push(current);
  return parts.map(normaliseSelector).filter(Boolean);
}

// "Display : NONE !important" -> { property: "display", value: "none", important: true }
export function parseDeclaration(text) {
  const colon = text.indexOf(":");
  if (colon < 0) return null;
  let value = squash(text.slice(colon + 1)).toLowerCase();
  const important = /!\s*important$/.test(value);
  if (important) value = value.replace(/\s*!\s*important$/, "");
  return { property: squash(text.slice(0, colon)).toLowerCase(), value: value.replace(/\s*,\s*/g, ", ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")"), important };
}

// Every innermost rule: { selectors, declarations, conditions }, conditions being the at-rule preludes around it.
export function cssRules(css) {
  const text = stripComments(css);
  const rules = [];
  const stack = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "{") {
      stack.push(squash(text.slice(start, index)));
      start = index + 1;
    } else if (char === "}") {
      const prelude = stack.pop() ?? "";
      const body = text.slice(start, index);
      if (prelude && !prelude.startsWith("@") && !body.includes("{")) {
        rules.push({
          selectors: splitSelectorList(prelude),
          declarations: body.split(";").map(parseDeclaration).filter(Boolean),
          conditions: stack.filter((entry) => entry.startsWith("@")).map((entry) => squash(entry).toLowerCase())
        });
      }
      start = index + 1;
    }
  }
  return rules;
}

// True when the rule has the declaration. "overflow: hidden" also matches "overflow: hidden !important";
// "display: none !important" needs the !important; a bare property name ("aspect-ratio") accepts any value.
export function hasDeclaration(rule, wanted) {
  if (!wanted.includes(":")) return rule.declarations.some((have) => have.property === wanted.trim().toLowerCase());
  const want = parseDeclaration(wanted);
  return rule.declarations.some((have) => have.property === want.property && have.value === want.value && (!want.important || have.important));
}
