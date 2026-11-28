import { contentVersion } from "../lib/script-version";

export const brand = {
  name: "I. Mads Lieu",
  tagline: "Astromineralogy&nbsp;· Planetology&nbsp;· Meteoritics",
  homeHref: "index.html"
} as const;

export const siteMetadata = {
  url: "https://erdwmads.github.io",
  title: "I. Mads Lieu Academic Website",
  author: "I. Mads Lieu",
  description: "Academic website of I. Mads Lieu, focused on astromineralogy, planetology, meteoritics, and primitive Solar System materials.",
  locale: "en_US"
} as const;

// ORCID iD, shown with ORCID's green iD icon (kept byte-for-byte as ORCID provides it).
export const orcid = {
  id: "0009-0007-3960-3959",
  url: "https://orcid.org/0009-0007-3960-3959",
  icon: "assets/img/orcid/ORCID-iD_icon-vector.svg"
} as const;

// Public profile facts only; keep the email out so the contact page's obfuscation still matters.
// alternateName keeps the full name and the former romanization so older search results still match;
// it is the only place the former name is published.
export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "I. Mads Lieu",
  givenName: "Ioong Mads",
  familyName: "Lieu",
  alternateName: ["Ioong Mads Lieu", "Mads LIU Yong"],
  url: `${siteMetadata.url}/`,
  image: `${siteMetadata.url}/assets/img/profile.jpg`,
  description: siteMetadata.description,
  sameAs: [orcid.url],
  affiliation: [
    {
      "@type": "CollegeOrUniversity",
      name: "Waseda University",
      department: "Department of Earth Sciences, School of Education"
    },
    {
      "@type": "OrganizationRole",
      roleName: "External Research Student",
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: "The University of Tokyo",
        department: "The University Museum"
      }
    }
  ],
  knowsAbout: ["Astromineralogy", "Planetology", "Meteoritics", "Carbonaceous chondrites", "Orgueil CI1 chondrite"]
} as const;

export const homeTitle = "Astromineralogy Research Archive | I. Mads Lieu";

// Home structured data: the site (WebSite) and the home page as a ProfilePage whose main entity is the Person above.
const { "@context": _personContext, ...personNode } = personSchema;
export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteMetadata.url}/#website`,
      url: `${siteMetadata.url}/`,
      name: siteMetadata.title,
      description: siteMetadata.description,
      inLanguage: "en",
      author: { "@id": `${siteMetadata.url}/#person` }
    },
    {
      "@type": "ProfilePage",
      "@id": `${siteMetadata.url}/#profile`,
      url: `${siteMetadata.url}/`,
      name: homeTitle,
      inLanguage: "en",
      isPartOf: { "@id": `${siteMetadata.url}/#website` },
      mainEntity: { "@id": `${siteMetadata.url}/#person`, ...personNode }
    }
  ]
} as const;

// No Home entry: the brand links home. Research pages come first, then personal pages; SiteHeader
// draws a quiet divider where the group changes.
export const navItems = [
  { href: "research.html", label: "Research", key: "research", group: "research" },
  { href: "ryugu-bennu.html", label: "Ryugu & Bennu", key: "ryugu-bennu", group: "research" },
  { href: "origins-study.html", label: "Origins", key: "origins", group: "research" },
  { href: "paper-shelf.html", label: "Paper Shelf", key: "paper-shelf", group: "research" },
  { href: "cv.html", label: "CV", key: "cv", group: "personal" },
  { href: "photography.html", label: "Photography", key: "photography", group: "personal" },
  { href: "contact.html", label: "Contact", key: "contact", group: "personal" }
] as const;

export const researchLogGate = {
  href: "research-log.html",
  label: "Research Log",
  status: "Active Archive",
  key: "research-log"
} as const;

export const contentPages = [
  { href: "index.html", title: "Home", key: "home" },
  { href: "research.html", title: "Research", key: "research" },
  { href: "ryugu-bennu.html", title: "Ryugu & Bennu", key: "ryugu-bennu" },
  { href: "origins-study.html", title: "Origins", key: "origins" },
  { href: "research-log.html", title: "Research Log", key: "research-log" },
  { href: "paper-shelf.html", title: "Paper Shelf", key: "paper-shelf" },
  { href: "cv.html", title: "CV", key: "cv" },
  { href: "photography.html", title: "Photography", key: "photography" },
  { href: "contact.html", title: "Contact", key: "contact" }
] as const;

// The stylesheet manifest: every file in src/styles/folio, in cascade order, as paths from the project root (spec
// §2.1). Pages link one bundle, assets/css/site.css, built from these files in this order with whitespace-only
// minification (src/lib/stylesheet-bundle.ts), so rule order stays exactly as written. The build fails if a listed
// file is missing or a file in src/styles/folio is not listed. Edit the source files, never the bundle; no component
// imports CSS, because Astro would emit it as a second render-blocking sheet. Layer order and naming:
// src/styles/folio/README.md.
export const stylesheets = [
  "src/styles/folio/00-tokens.css",
  "src/styles/folio/01-fonts.css",
  "src/styles/folio/02-reset.css",
  "src/styles/folio/03-base.css",
  "src/styles/folio/04-layout.css",
  "src/styles/folio/05-utilities.css",
  "src/styles/folio/components/button.css",
  "src/styles/folio/components/marker.css",
  "src/styles/folio/components/evidence-status.css",
  "src/styles/folio/components/masthead.css",
  "src/styles/folio/components/plate.css",
  "src/styles/folio/components/ledger.css",
  "src/styles/folio/components/table.css",
  "src/styles/folio/components/disclosure.css",
  "src/styles/folio/components/form.css",
  "src/styles/folio/components/frames.css",
  "src/styles/folio/components/header.css",
  "src/styles/folio/components/footer.css",
  "src/styles/folio/components/continue-reading.css",
  "src/styles/folio/components/fx-dock.css",
  "src/styles/folio/components/backdrop.css",
  "src/styles/folio/components/ambient.css",
  "src/styles/folio/components/interface-2046.css",
  "src/styles/folio/components/mineral-fx.css",
  "src/styles/folio/components/arrival.css",
  "src/styles/folio/components/research-guide.css",
  "src/styles/folio/components/pathway.css",
  "src/styles/folio/components/comparison.css",
  "src/styles/folio/components/image-inspector.css",
  "src/styles/folio/components/research-scale.css",
  "src/styles/folio/components/scene.css",
  "src/styles/folio/components/planetary.css",
  "src/styles/folio/components/sample-missions.css",
  "src/styles/folio/components/origins.css",
  "src/styles/folio/components/presentation.css",
  "src/styles/folio/components/lightbox.css",
  "src/styles/folio/components/atlas.css",
  "src/styles/folio/components/mission-log.css",
  "src/styles/folio/components/surface-light.css",
  "src/styles/folio/pages/home.css",
  "src/styles/folio/pages/home-opening.css",
  "src/styles/folio/pages/research.css",
  "src/styles/folio/pages/research-log.css",
  "src/styles/folio/pages/ryugu-bennu.css",
  "src/styles/folio/pages/origins.css",
  "src/styles/folio/pages/paper-shelf.css",
  "src/styles/folio/pages/photography.css",
  "src/styles/folio/pages/cv.css",
  "src/styles/folio/pages/contact.css",
  "src/styles/folio/pages/not-found.css",
  "src/styles/folio/pages/graduation.css",
  "src/styles/folio/states/overlays.css",
  "src/styles/folio/states/motion.css",
  "src/styles/folio/states/contrast.css",
  "src/styles/folio/states/print.css"
] as const;

// The second item is the overarching, long-term question, labelled so it is not read as the thesis question.
export const footerItems = ["© 2026 I. Mads Lieu", "Long-term question: What was responsible for making diverse planets in the Solar System?"] as const;

// Classic scripts in public/assets/js/. Each URL carries a content hash computed at build time
// (src/lib/script-version.ts), so there is no hand-written ?v= string to bump.
//
// Page lifecycle: shell scripts load once per document and keep running across soft navigation
// (legacy-navigation.js). Page scripts are rendered with data-page-script; soft navigation runs those,
// and only those, again when it opens their page. Inline shell scripts (theme preload, the header
// controller, the entrance opener, JSON-LD) never carry the attribute, so they never run twice.
type ScriptSpec = {
  file: string;
  defer?: boolean;
};

// Shell scripts, in load order around the page scripts. power-manager.js runs first and is not deferred.
const powerManagerScript: ScriptSpec = { file: "power-manager.js" };

const shellScriptsBeforePage: ScriptSpec[] = [
  { file: "theme.js", defer: true },
  { file: "ambient-space.js", defer: true },
  { file: "research-coordinates.js", defer: true }
];

const interfaceScript: ScriptSpec = { file: "interface-2046.js", defer: true };

const shellScriptsAfterPage: ScriptSpec[] = [
  { file: "observatory-interactions.js", defer: true },
  { file: "mineral-interactions.js", defer: true }
];

// legacy-navigation.js runs last, after any inline HTML a page adds.
const navigationScript: ScriptSpec = { file: "legacy-navigation.js", defer: true };

const pageScripts: Record<string, ScriptSpec[]> = {
  contact: [{ file: "contact.js", defer: true }],
  cv: [{ file: "cv.js", defer: true }],
  // The Home opening (2026-11-28): the path's set-ins and the band hold-back without scroll-driven animations.
  home: [{ file: "home-path.js", defer: true }],
  "paper-shelf": [{ file: "paper-shelf.js", defer: true }],
  // Password-gated public page; keep it out of sitemap contentPages.
  "research-graduation": [
    { file: "research-passkey.js", defer: true },
    { file: "research-lock.js", defer: true },
    { file: "mission-index.js", defer: true },
    { file: "mission-lightbox.js", defer: true }
  ]
};

function renderScript(spec: ScriptSpec, pageScoped = false) {
  const src = `assets/js/${spec.file}`;
  const defer = spec.defer ? " defer" : "";
  const scope = pageScoped ? " data-page-script" : "";
  return `<script src="${src}?v=${contentVersion(src)}"${defer}${scope}></script>`;
}

// inlineHtml is raw page HTML placed before legacy-navigation.js; mark any inline <script> in it with
// data-page-script if soft navigation should run it again.
export function getPageScripts(pageKey: string, inlineHtml = "") {
  const scripts = pageScripts[pageKey] || [];
  return [
    renderScript(powerManagerScript),
    [
      ...shellScriptsBeforePage.map((spec) => renderScript(spec)),
      ...scripts.map((spec) => renderScript(spec, true)),
      renderScript(interfaceScript)
    ].join("\n"),
    ...shellScriptsAfterPage.map((spec) => renderScript(spec)),
    inlineHtml,
    renderScript(navigationScript)
  ].filter(Boolean).join("\n\n");
}
