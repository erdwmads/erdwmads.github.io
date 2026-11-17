// Frozen JS hooks (spec §2.3, §3.5): the classes, ids and data attributes that behaviour scripts query or create,
// taken from inventory §3 and checked by scripts/js-hooks.test.mjs. CSS may restyle these elements but never rename
// them; a rename changes this table, the script and the markup in one commit.
//   queried  selectors a script looks up (querySelector, closest, matches, getElementById), and classes or data
//            attributes it reads (classList.contains, getAttribute, hasAttribute, dataset). Each class, id and data
//            attribute in them must come from the markup sources (src/**/*.astro, src/legacy/*.html) or from a
//            script that creates it.
//   created  classes, ids and data attributes a script writes (className, class="…" markup, classList.add and
//            toggle, setAttribute, dataset). Each must still appear in that script.
// Element names, aria-* and other standard attributes are not hooks and are not checked.
export const scripts = {
  "public/assets/js/ambient-space.js": {
    queried: [
      ".ambient-dust", ".ambient-fx-toggle", ".ambient-space-layer", ".is-gold-dust", ".mineral-atlas-open",
      ".mission-lightbox-open"
    ],
    created: [
      "#ambient-fx-description", ".ambient-dust", ".ambient-fx-disabled", ".ambient-fx-toggle",
      ".ambient-fx-toggle__dot", ".ambient-fx-toggle__text", ".ambient-meteor", ".ambient-paused", ".ambient-pebble",
      ".ambient-space-layer", ".is-flying", ".is-gold-dust", ".is-gold-meteor", ".is-on"
    ]
  },
  "public/assets/js/contact.js": {
    queried: [
      "[data-email-actions]", "[data-email-address]", "[data-email-compose]", "[data-email-copy]",
      "[data-email-status]"
    ],
    created: []
  },
  "public/assets/js/cv.js": {
    queried: [
      "[data-email-print]", "[data-email-print][data-shown]", "[data-print-cv]", "[data-shown]"
    ],
    created: [
      "[data-shown]"
    ]
  },
  "public/assets/js/interface-2046.js": {
    queried: [
      ".ambient-fx-disabled", ".entry-gate, .ui2046-layer, .ui2046-progress", ".is-edge-teardown",
      ".mineral-atlas-open", ".mission-lightbox-open", ".ui2046-layer, .ui2046-progress, .entry-gate",
      ".ui2046-planet-label", ".ui2046-solar-system", ".ui2046-system-orbit .ui2046-planet", "[data-angle]",
      "[data-index]", "[data-interface2046]", "[data-label-index]", "[data-period]", "[data-ui2046-route]",
      "main h1, .hero h1, .page-title"
    ],
    created: [
      ".is-edge-browser", ".is-edge-page-exiting", ".is-edge-teardown", ".mads-mobile-lite", ".sun-marker",
      ".ui2046-kuiper-belt", ".ui2046-layer", ".ui2046-orbit-track", ".ui2046-planet", ".ui2046-planet-label",
      ".ui2046-progress", ".ui2046-rail", ".ui2046-rail-line", ".ui2046-right", ".ui2046-solar-system",
      ".ui2046-system-label", ".ui2046-system-orbit", "[data-angle]", "[data-index]", "[data-interface2046]",
      "[data-label-index]", "[data-period]", "[data-ui2046-route]"
    ]
  },
  "public/assets/js/legacy-navigation.js": {
    queried: [
      "#missions-title", ".mads-soft-nav-active", ".nav a, .nav-log-gate",
      ".site-header a[href], main a[href], .site-footer a[href]", "[data-full-nav]",
      "body script[data-page-script], body script[type=\"module\"][src]"
    ],
    created: [
      ".mads-soft-nav-active"
    ]
  },
  "public/assets/js/mineral-interactions.js": {
    queried: [
      ".ambient-fx-disabled", ".atlas-close", ".atlas-detail", ".atlas-map", ".atlas-node", ".mineral-atlas-open",
      ".mission-log-entry", ".mission-log-entry:not(.mission-log-entry-placeholder)", ".mission-photo-grid figure",
      ".mission-record-actions", ".research-note-body", ".research-note-date", ".research-unlocked",
      ".site-header [aria-current=\"page\"]", "[data-connection]", "[data-group]", "[data-log-latest-note]",
      "[data-log-next-step]", "[data-log-question-note]", "[data-log-question]", "[data-log-stage]",
      "[data-polarisation]", "[data-private-atlas]", "[data-public-atlas-data]", "[data-public-atlas]",
      "[data-public-atlas], [data-private-atlas]"
    ],
    created: [
      "#atlas-title", "#atlas-workflow-detail", ".atlas-close", ".atlas-core", ".atlas-description", ".atlas-detail",
      ".atlas-footer", ".atlas-header", ".atlas-kicker", ".atlas-launch", ".atlas-layout", ".atlas-map",
      ".atlas-node", ".atlas-node-index", ".atlas-public", ".atlas-source", ".atlas-source-button", ".atlas-status",
      ".atlas-step", ".atlas-step-label", ".atlas-step-number", ".atlas-table-scroll", ".button", ".evidence-atlas",
      ".is-running", ".is-selected", ".mineral-atlas-open", ".mineral-cleavage", "[data-connection]", "[data-group]",
      "[data-polarising]", "[data-private-atlas]"
    ]
  },
  "public/assets/js/mission-index.js": {
    queried: [
      ".mission-jump-card", ".research-unlocked", "[data-full-src]", "[data-i18n-key]", "[data-initial-log-id]",
      "[data-mission-auto-start]", "[data-mission-compare-select]", "[data-mission-compare-toggle]",
      "[data-mission-comparison]", "[data-mission-index-list]", "[data-mission-log-list]"
    ],
    created: [
      "#mission-compare-date", "#mission-comparison", ".button", ".is-active", ".is-loading",
      ".mission-compare-toggle", ".mission-comparison-figure", ".mission-comparison-grid",
      ".mission-comparison-note", ".mission-comparison-record", ".mission-comparison-toolbar",
      ".mission-index-ready", ".mission-jump-card", ".mission-jump-log",
      ".mission-log-entry", ".mission-log-entry-placeholder", ".mission-log-lazy-render", ".mission-original-record",
      ".mission-progress", ".mission-progress-heading", ".mission-record-actions", ".mission-record-header",
      ".mission-record-meta", ".research-note-body", ".research-note-card", ".research-note-date", ".secondary",
      "[data-full-src]", "[data-log-date]", "[data-log-latest-note]", "[data-log-next-note]", "[data-log-next-step]",
      "[data-log-question-note]", "[data-log-question]", "[data-log-stage-note]", "[data-log-stage]",
      "[data-mission-compare-select]", "[data-mission-compare-toggle]", "[data-mission-comparison]",
      "[data-mission-target]"
    ]
  },
  "public/assets/js/mission-lightbox.js": {
    queried: [
      ".is-open", ".mission-lightbox__caption", ".mission-lightbox__close", ".mission-lightbox__counter",
      ".mission-lightbox__img", ".mission-lightbox__next", ".mission-lightbox__prev", ".mission-lightbox__viewer",
      ".mission-log-entry", ".mission-comparison-figure", ".mission-photo-grid figure",
      ".mission-photo-grid figure, .mission-comparison-figure", "[data-mission-comparison]", "[data-mobile-full-src]"
    ],
    created: [
      ".is-decoding", ".is-open", ".is-ready", ".mission-lightbox", ".mission-lightbox-open",
      ".mission-lightbox__btn", ".mission-lightbox__caption", ".mission-lightbox__captionbar",
      ".mission-lightbox__close", ".mission-lightbox__close-icon", ".mission-lightbox__counter",
      ".mission-lightbox__figure", ".mission-lightbox__img", ".mission-lightbox__nav", ".mission-lightbox__next",
      ".mission-lightbox__prev", ".mission-lightbox__stage", ".mission-lightbox__viewer",
      ".mobile-mission-lightbox-disabled"
    ]
  },
  "public/assets/js/observatory-interactions.js": {
    queried: [
      ".ambient-fx-disabled", ".ambient-fx-toggle", ".header-actions .nav", ".mission-log-entry",
      ".mission-photo-grid img", ".mission-record-actions", ".nav a, .nav-log-gate", ".obs-fullscreen-status",
      ".obs-fx-settings", ".obs-image-status", ".obs-present-close", ".obs-present-fullscreen", ".obs-present-next",
      ".obs-present-original", ".obs-present-prev", ".obs-present-retry", ".obs-presentation-caption",
      ".obs-presentation-counter", ".obs-presentation-feedback", ".obs-presentation-surface", ".photo-tile img", ".photo-wall",
      ".research-coordinates", ".research-note-body", ".site-header", ".ui2046-system-orbit", "[data-full-src]",
      "[data-index]", "[data-mobile-full-src]", "[data-nav-ready]", "[data-nav-toggle]",
      "[data-photo-index]", "[data-present-mission]", "[data-present-photos]",
      "[data-present-photos], [data-present-mission], [data-photo-index]"
    ],
    created: [
      "#obs-fx-panel", ".button", ".is-route-active", ".mission-lightbox-open",
      ".obs-fullscreen-status", ".obs-fx-dock", ".obs-fx-panel", ".obs-fx-settings", ".obs-image-status",
      ".obs-nav-beam", ".obs-nav-ready", ".obs-photo-flight", ".obs-present-close", ".obs-present-fullscreen",
      ".obs-present-launch", ".obs-present-next", ".obs-present-original", ".obs-present-prev", ".obs-present-retry",
      ".obs-presentation", ".obs-presentation-caption", ".obs-presentation-counter", ".obs-presentation-feedback",
      ".obs-presentation-stage", ".obs-presentation-surface", ".obs-presentation-toolbar", ".obs-presenting",
      ".secondary", "[data-fx-intensity]", "[data-orbit-route]", "[data-present-mission]"
    ]
  },
  "public/assets/js/paper-shelf.js": {
    queried: [
      "[data-paper-card]", "[data-paper-copy-fallback]", "[data-paper-copy-status]", "[data-paper-copy]",
      "[data-paper-count]", "[data-paper-empty]", "[data-paper-filter]", "[data-paper-filters]",
      "[data-paper-group-count]", "[data-paper-group]", "[data-paper-reference-text]", "[data-paper-reference]",
      "[data-paper-reset]", "[data-paper-search]", "[data-paper-text]"
    ],
    created: []
  },
  "public/assets/js/power-manager.js": {
    queried: [],
    created: [
      ".mads-page-hidden", ".mads-power-idle", ".mads-power-low", ".mads-power-mobile"
    ]
  },
  "public/assets/js/research-coordinates.js": {
    queried: [
      "#obs-fx-panel", ".research-coordinates"
    ],
    created: [
      ".research-coordinates"
    ]
  },
  "public/assets/js/research-lock.js": {
    queried: [
      "[data-passkey-controls]", "[data-passkey-forget]", "[data-passkey-setup]", "[data-passkey-status]",
      "[data-passkey-unlock]", "[data-protected-archive-url]", "[data-research-lock-content]",
      "[data-research-lock-error]", "[data-research-lock-form]", "[data-research-lock-gate]",
      "[data-research-lock-input]", "[data-research-lock-now]", "[data-research-lock-session]",
      "[data-research-session-notice]"
    ],
    created: [
      ".research-unlocked"
    ]
  },
  "public/assets/js/site-header.js": {
    queried: [
      ".mobile-nav-open", "[data-mobile-nav]", "[data-nav-toggle]"
    ],
    created: [
      ".mobile-nav-open", "[data-nav-ready]"
    ]
  },
  "public/assets/js/theme.js": {
    queried: [
      ".theme-toggle", "[data-theme]"
    ],
    created: [
      ".space-mode", ".theme-preloaded-space", "[data-theme-space]", "[data-theme]"
    ]
  },
  "src/scripts/arrival/entry.js": {
    queried: [
      "#arrival-replay", "#arrival-skip", "#arrival-universe", "#cosmic-arrival", ".arrival-label", ".arrival-name",
      ".arrival-number", ".arrival-signature", ".arrival-track span", ".ui-page-home", "[data-arrival-icon]",
      "[data-arrival-replay]"
    ],
    created: [
      ".cosmic-arrival-active", "[data-progress]", "[data-state]"
    ]
  },
  "src/scripts/arrival/solar.js": {
    queried: [],
    created: [
      ".celestial-labels"
    ]
  },
  "src/scripts/image-inspector.js": {
    queried: [
      "[data-image-inspector]", "[data-initialized]", "[data-inspector-controls]", "[data-inspector-hint]",
      "[data-inspector-image]", "[data-inspector-output]", "[data-inspector-region]", "[data-inspector-stage]",
      "[data-inspector-status]", "[data-inspector-touch]", "[data-inspector-zoom]", "[data-moving]"
    ],
    created: [
      "[data-dragging]", "[data-initialized]", "[data-inspector-ready]", "[data-moving]", "[data-zoomed]"
    ]
  },
  "src/scripts/inline/arrival-gate.js": {
    queried: [
      "#arrival-skip", "#cosmic-arrival", "[data-home]"
    ],
    created: [
      ".cosmic-arrival-active", "[data-state]"
    ]
  },
  "src/scripts/inline/theme-preload.js": {
    queried: [],
    created: [
      ".theme-preloaded-space", "[data-theme-space]", "[data-theme]"
    ]
  },
  "src/scripts/origins-study/chapter-reader.js": {
    queried: [
      "#fragment-guide", "#legend", "#material-note", "#mineral-budget", "#moment", "#reaction-sequence",
      "#scene-counter", "#section-locator", ".observatory button:not(#retry-scene),.observatory input", "[data-stage]"
    ],
    created: []
  },
  "src/scripts/origins-study/loader.js": {
    queried: [
      "#evidence", "#loading", "#play", "#retry-scene", "#scene", "#sources", ".close",
      ".observatory button:not(#retry-scene),.observatory input", ".origins-study", "[data-render-state]"
    ],
    created: [
      "[data-render-state]"
    ]
  },
  "src/scripts/origins-study/main.js": {
    queried: [
      "#explore", "#fragment-guide", "#legend", "#loading", "#material-mode", "#material-note", "#moment",
      "#phase-mode", "#play", "#progress", "#progress-value", "#reaction-sequence", "#reset", "#retry-scene", "#scene",
      "#section-locator", "#viewport", "#zoom-in", "#zoom-out", ".chapter-description", ".chapter-heading",
      ".observatory button:not(#retry-scene),.observatory input", ".scene-note", "[data-process-progress]", "[data-ready]",
      "[data-render-state]", "[data-scene-poster]"
    ],
    created: [
      ".study-dissolve", "[data-exploring]", "[data-in-view]", "[data-lucide]", "[data-ready]",
      "[data-render-state]", "[data-scene-poster]"
    ]
  },
  "src/scripts/photo-layout.js": {
    queried: [
      "[data-layout-ready]", "[data-photo-experience]", "[data-photo-layout-controls]", "[data-photo-layout]",
      "button[data-photo-layout]"
    ],
    created: [
      "[data-layout-ready]", "[data-photo-layout]"
    ]
  },
  "src/scripts/planetary-explorer.js": {
    queried: [
      "#planetary-panel", ".ambient-fx-disabled", ".planetary-interaction-bar", ".planetary-interaction-bar>span",
      ".planetary-measure", ".planetary-sharing", ".planetary-toolbar", ".planetary-visual",
      "[data-action=\"interact\"]", "[data-action=\"now\"]", "[data-action=\"play\"]", "[data-action]",
      "[data-angle]", "[data-date]", "[data-date],[data-timeline]", "[data-focus-fx]", "[data-icon]",
      "[data-initialized]", "[data-interact-label]", "[data-material]", "[data-mineral-detail]", "[data-mineral]",
      "[data-mode]", "[data-planetary-explorer]", "[data-render-state]", "[data-scope]", "[data-speed]",
      "[data-timeline]", "[data-touch-active]", "[data-view=\"sample\"]", "[data-view]"
    ],
    created: [
      "[data-active-material]", "[data-day]", "[data-focus-fx]", "[data-focus]", "[data-initialized]", "[data-mode]",
      "[data-render-state]", "[data-touch-active]"
    ]
  },
  "src/scripts/planetary-renderer.js": {
    queried: [
      "[data-fallback]", "[data-labels]", "[data-model-ready]", "[data-object]", "[data-render-state]",
      "[data-retry]", "[data-scene-poster]", "[data-scope]", "[data-stage]", "[data-status]", "[data-theme]",
      "[data-zoom]"
    ],
    created: [
      ".planetary-label", ".planetary-leaders", "[data-model-ready]", "[data-object]", "[data-render-state]",
      "[data-scene-poster]", "[data-zoom]"
    ]
  },
  "src/scripts/research-guide.js": {
    queried: [
      "[data-open]", "[data-ready]", "[data-research-guide-current]", "[data-research-guide-toggle]",
      "[data-research-guide]", "[data-section-label]"
    ],
    created: [
      "[data-open]", "[data-ready]", "[data-research-reading]"
    ]
  },
  "src/scripts/research-questions.js": {
    queried: [
      "[data-question-answer]", "[data-question-explore]", "[data-question-source]", "[data-question]"
    ],
    created: []
  },
  "src/scripts/sample-missions/loader.js": {
    queried: [
      "#mission-player", ".mission-copy", ".mission-selector", "[data-initialized]", "[data-mission-action]",
      "[data-mission-icon]", "[data-mission-progress], [data-mission-action]", "[data-mission-stage]",
      "[data-mission]", "[data-overflow]", "[data-ready]", "[data-sample-missions]", "[data-scene-poster]",
      "[data-touch-active]"
    ],
    created: [
      "[data-initialized]", "[data-mission-in-view]", "[data-mission-stage]", "[data-overflow]", "[data-ready]",
      "[data-scene-poster]", "[data-touch-active]"
    ]
  },
  "src/scripts/sample-missions/story.js": {
    queried: [
      "[data-mission-stage]", "[data-mission-story-name]", "[data-mission-story-panel]",
      "[data-mission-story-phase]"
    ],
    created: []
  },
  "src/scripts/sample-missions/viewer.js": {
    queried: [
      "[data-mission-flight-cue]", "[data-mission-inset-target]", "[data-mission-inset]",
      "[data-mission-inset],[data-mission-inset-target],[data-mission-scale],[data-mission-flight-cue],[data-mission-solar-context],[data-mission-site-map],[data-mission-legend]",
      "[data-mission-labels]", "[data-mission-legend]", "[data-mission-scale]"
    ],
    created: [
      ".mission-leader"
    ]
  }};

// Selectors built at run time from a prefix and a name, such as el = name => root.querySelector(`[data-${name}]`),
// or $('#' + id) over a list of ids (prefix "#"). Each name must still appear quoted in its script, and the hook it
// names (builtToken: [prefix + name], or #name) must come from the markup. composed names are assembled from parts in
// the script ('solar-' + body), so only the markup side is checked.
export const builtSelectors = [
  {
    file: "src/scripts/planetary-explorer.js",
    prefix: "data-",
    names: [
      "angle", "boundary", "camera-tools", "ci-figure", "clock-status", "date", "description", "detail-label", "epoch",
      "evidence", "facts", "fallback", "interpretation", "labels", "mindat", "mineral-caption", "mineral-detail",
      "mineral-diagram", "object-title", "orbit-tools", "retry", "sample-credit", "sample-error", "sample-figure",
      "sample-image", "scale-note", "scope", "shape-tools", "share", "share-link", "share-status", "source", "speed",
      "stage", "status", "summary", "time-controls", "timeline", "view-settings", "view-settings-body", "visual"
    ]
  },
  {
    file: "src/scripts/sample-missions/loader.js",
    prefix: "data-mission-",
    names: [
      "announcement", "chapter-position", "chapters", "context", "date", "description", "detail", "dimensions", "frame",
      "frame-explanation", "frame-summary", "hint", "journey-info", "journey-note", "journey-range", "journey-time",
      "loading", "location", "location-note", "notebook", "number", "percent", "percent-short", "physical",
      "play-label", "play-short", "progress", "purpose", "range", "range-chart", "range-direction", "range-dot",
      "range-line", "range-summary", "samples", "scene", "share-manual", "share-status", "share-url", "site-map",
      "source", "speed-earth", "speed-relative", "speed-sun", "status", "title", "touch-label", "trajectory-source",
      "utc", "vector-earth", "vector-relative", "vector-sun", "viewport"
    ]
  },
  {
    file: "src/scripts/sample-missions/flight-cues.js",
    prefix: "data-mission-",
    names: ["cue-detail", "cue-title", "solar-context", "solar-next", "solar-target-name"],
    composed: ["solar-earth", "solar-earth-orbit", "solar-target", "solar-target-orbit"]
  },
  {
    file: "src/scripts/sample-missions/viewer.js",
    prefix: "data-inset-",
    names: ["target", "vehicle"]
  },
  {
    file: "src/scripts/origins-study/chapter-reader.js",
    prefix: "#",
    names: ["description", "environment", "eyebrow", "growth-sequence", "inheritance-sequence", "scale", "title"]
  },
  {
    file: "src/scripts/origins-study/main.js",
    prefix: "#",
    names: ["growth-sequence", "inheritance-sequence"]
  }
];

// Queried hooks that no source file provides, with the reason.
export const unsourced = {
  // Markup inside the encrypted Mission Log entries (bodyHtml); only the unlocked archive carries it.
  payload: [".mission-photo-grid", "[data-mobile-full-src]"],
  // Opt-in attributes a page or list may set; none does today. planetary-explorer.js falls back from el("visual")
  // to .planetary-visual.
  optional: ["[data-full-nav]", "[data-initial-log-id]", "[data-visual]"],
  // Read only to clean up or fall back on retired markup (inventory §6).
  vestigial: [".entry-gate", ".hero", ".page-title"]
};

// Hooks that a planned edit removes (spec §3.4). While one is missing, the test reports it as pending for the named
// package instead of failing. The rebuild's entries (R2, R3, the Mission Index rows, .hero) were cleared at integration;
// a new entry is { file, tokens, owner, why }.
export const changing = [];

// The classes, ids and data attributes in a selector: ".a b[data-x='1'] #c:not(.d)" -> [".a", ".d", "#c", "[data-x]"].
export function selectorTokens(selector) {
  const attributes = [...selector.matchAll(/\[\s*([\w-]+)/g)].map((match) => match[1]).filter((name) => name.startsWith("data-")).map((name) => `[${name}]`);
  const bare = selector.replace(/\[[^\]]*\]/g, "").replace(/(['"`]).*?\1/g, "");
  const classes = [...bare.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => `.${match[1]}`);
  const ids = [...bare.matchAll(/#(-?[_a-zA-Z][\w-]*)/g)].map((match) => `#${match[1]}`);
  return [...new Set([...classes, ...ids, ...attributes])];
}

// The hook a built selector names: "#" + name for an id prefix, otherwise the data attribute [prefix + name].
export const builtToken = (prefix, name) => (prefix === "#" ? `#${name}` : `[${prefix}${name}]`);

// The table as rows: { selector, file, kind: "queried" | "created" }, built selectors included.
export function hookRows() {
  const rows = Object.entries(scripts).flatMap(([file, { queried, created }]) => [
    ...queried.map((selector) => ({ selector, file, kind: "queried" })),
    ...created.map((selector) => ({ selector, file, kind: "created" }))
  ]);
  for (const { file, prefix, names, composed = [] } of builtSelectors) {
    for (const name of [...names, ...composed]) rows.push({ selector: builtToken(prefix, name), file, kind: "queried" });
  }
  return rows;
}

// The selectors a script looks up through string literals, for the completeness test: every literal argument of
// querySelector(All), closest, matches and getElementById (as "#id"); of the file's own $() helper when it defines
// one (origins-study: const $ = s => root.querySelector(s)); and every literal in an array the script maps through
// one of these ([".a", "#b"].map(selector => $(selector))). A ${…} inside an attribute value only fills the value
// ([data-arrival-icon="${name}"] names [data-arrival-icon]); anywhere else, and in a fragment such as '[data-mission-'
// + name + ']', the hook is built from parts and belongs in builtSelectors.
export function scanQueries(text) {
  const found = [];
  const usable = (value) => !/\[[^\]]*$/.test(value) && !/\[\s*[\w-]*\$\{/.test(value) && !value.replace(/\[[^\]]*\]/g, "").includes("${");
  const literals = (args) => [...args.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)].map((match) => match[2]).filter(usable);
  const argumentsAt = (open) => {
    let depth = 0, index = open;
    for (; index < text.length; index++) {
      if (text[index] === "(") depth += 1;
      if (text[index] === ")" && --depth === 0) break;
    }
    return text.slice(open + 1, index);
  };
  const helper = /\b(?:const|let)\s+\$\s*=|[,;(]\s*\$\s*=\s*\(?\s*\w+\s*\)?\s*=>/.test(text);
  const call = new RegExp(`\\b(querySelectorAll|querySelector|closest|matches|getElementById)\\(${helper ? "|(?<![\\w$.])\\$\\(" : ""}`, "g");
  for (const match of text.matchAll(call)) {
    for (const value of literals(argumentsAt(match.index + match[0].length - 1))) {
      if (match[1] === "getElementById") {
        if (/^[\w-]+$/.test(value)) found.push(`#${value}`);
      } else if (selectorTokens(value).length && !/^[.#]$/.test(value)) {
        found.push(value);
      }
    }
  }
  for (const match of text.matchAll(/\[([^[\]]*)\]\s*\.(?:map|forEach)\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*(?:\$|\w+\.querySelector(?:All)?)\(\s*\2\s*\)/g)) {
    found.push(...literals(match[1]).filter((value) => selectorTokens(value).length));
  }
  return found;
}
