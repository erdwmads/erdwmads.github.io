export const brand = {
  name: "Mads LIU YONG",
  tagline: "Cosmic Mineralogy &bull; Planetary Sciences &bull; Meteoritics",
  homeHref: "index.html"
} as const;

export const siteMetadata = {
  url: "https://erdwmads.github.io",
  title: "Mads LIU YONG Academic Website",
  description: "Academic website of Mads LIU YONG, focused on cosmic mineralogy, planetary sciences, meteoritics, and primitive Solar System materials.",
  image: "assets/img/Solar_System_true_color.jpg",
  locale: "en_US"
} as const;

export const navItems = [
  { href: "index.html", label: "Home", key: "home" },
  { href: "research.html", label: "Research", key: "research" },
  { href: "research-log.html", label: "Research Log", key: "research-log" },
  { href: "paper-shelf.html", label: "Paper Shelf", key: "paper-shelf" },
  { href: "cv.html", label: "CV", key: "cv" },
  { href: "photography.html", label: "Photography", key: "photography" },
  { href: "contact.html", label: "Contact", key: "contact" }
] as const;

export const contentPages = [
  { href: "index.html", title: "Home", key: "home" },
  { href: "research.html", title: "Research", key: "research" },
  { href: "research-log.html", title: "Research Log", key: "research-log" },
  { href: "paper-shelf.html", title: "Paper Shelf", key: "paper-shelf" },
  { href: "cv.html", title: "CV", key: "cv" },
  { href: "photography.html", title: "Photography", key: "photography" },
  { href: "contact.html", title: "Contact", key: "contact" },
  { href: "sample-cabinet.html", title: "Sample Cabinet", key: "sample-cabinet" }
] as const;

export const footerItems = ["(c) 2026 Mads LIU YONG", "Built for GitHub Pages"] as const;

type ScriptSpec = {
  src: string;
  defer?: boolean;
};

const commonScripts: ScriptSpec[] = [
  { src: "assets/js/theme.js", defer: true },
  { src: "assets/js/ambient-space.js", defer: true },
  { src: "assets/js/research-coordinates.js", defer: true }
];

const interfaceScript: ScriptSpec = { src: "assets/js/interface-2046.js", defer: true };
const researchLockScript: ScriptSpec = { src: "assets/js/research-lock.js", defer: true };

const pageScripts: Record<string, ScriptSpec[]> = {
  contact: [...commonScripts, interfaceScript],
  cv: [...commonScripts, interfaceScript],
  home: [...commonScripts, interfaceScript],
  "paper-shelf": [...commonScripts, { src: "assets/js/paper-shelf.js", defer: true }, interfaceScript],
  photography: [{ src: "assets/js/photography.js" }, ...commonScripts, interfaceScript],
  research: [...commonScripts, interfaceScript],
  "research-log": [researchLockScript, ...commonScripts, interfaceScript],
  // Used only by the local Mission Log build. Keep this page out of contentPages.
  "research-graduation": [
    researchLockScript,
    ...commonScripts,
    { src: "assets/js/mission-index.js", defer: true },
    { src: "assets/js/mission-lightbox.js", defer: true },
    { src: "assets/js/mission-status-sync.js", defer: true },
    interfaceScript
  ],
  "sample-cabinet": commonScripts
};

function renderScript(spec: ScriptSpec) {
  const defer = spec.defer ? " defer" : "";
  return `<script src="${spec.src}"${defer}></script>`;
}

export function getPageScripts(pageKey: keyof typeof pageScripts | string, inlineHtml = "") {
  const scripts = pageScripts[pageKey] || pageScripts.home;
  return [scripts.map(renderScript).join("\n"), inlineHtml].filter(Boolean).join("\n\n");
}
