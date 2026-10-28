// Paper Shelf source data.
//
// Keep `papers` a JSON literal ending in `as const;`: scripts/check-site.mjs and
// scripts/paper-shelf.test.mjs parse it as JSON; scripts/export-ppt-data.mjs imports it.
//
// - id: stable card anchor (paper-shelf.html#king-2015). Never reuse or rename one.
// - legacyAnchor: the #paper-N anchor the paper had before stable ids; old links and
//   the research atlas still use it. New papers do not get one.
// - primaryFilter: the one category the paper is grouped under; it must be in filters.
// - filters: every category whose filter button should show the paper.
// - authors: every author when there are two or fewer, otherwise the first author
//   (Zega 2025 also lists McCoy, second in Crossref, so the shelf search finds him);
//   authorCount is the full count. Bibliographic fields follow the publisher's
//   Crossref record for the DOI (checked 2026-10-24); never guess a field. scripts/paper-shelf.test.mjs requires
//   a DOI and a volume plus pages or article number for every paper, so a paper that lacks one needs a deliberate test change.
//   Exception: Crossref drops the ß in Endreß (1996); keep the published spelling.
// - summary: what the paper reports. relevance: why it matters for my project, as
//   literature context, never as my own result.
export const papers = [
  {
    "id": "king-2015",
    "legacyAnchor": "paper-1",
    "primaryFilter": "methods",
    "filters": [
      "ci-orgueil",
      "methods"
    ],
    "title": "Modal mineralogy of CI and CI-like chondrites by X-ray diffraction",
    "authors": [
      { "family": "King", "initials": "A. J." }
    ],
    "authorCount": 4,
    "year": 2015,
    "journal": "Geochimica et Cosmochimica Acta",
    "volume": "165",
    "pages": "148–160",
    "doi": "10.1016/j.gca.2015.05.038",
    "summary": "Bulk XRD baseline for CI chondrites, including the abundance of phyllosilicates, magnetite, sulfides, and carbonates.",
    "relevance": "Bulk CI mineral abundances that frame the matrix around carbonate candidates in Orgueil.",
    "tags": [
      "CI chondrite",
      "XRD",
      "Modal mineralogy"
    ]
  },
  {
    "id": "gregg-2015",
    "legacyAnchor": "paper-2",
    "primaryFilter": "dolomite",
    "filters": [
      "dolomite"
    ],
    "title": "Mineralogy, nucleation and growth of dolomite in the laboratory and sedimentary environment: A review",
    "authors": [
      { "family": "Gregg", "initials": "J. M." }
    ],
    "authorCount": 4,
    "year": 2015,
    "journal": "Sedimentology",
    "volume": "62",
    "pages": "1749–1769",
    "doi": "10.1111/sed.12202",
    "summary": "Review paper for dolomite mineralogy, ordering, nucleation, growth, and the difficulty of low-temperature dolomite synthesis.",
    "relevance": "Why low-temperature dolomite is hard to grow, and why cation ordering, not the Ca/Mg ratio alone, identifies it.",
    "tags": [
      "Dolomite",
      "Nucleation",
      "Review"
    ]
  },
  {
    "id": "fujiya-2023",
    "legacyAnchor": "paper-3",
    "primaryFilter": "ryugu-bennu",
    "filters": [
      "dolomite",
      "ryugu-bennu",
      "methods"
    ],
    "title": "Carbonate record of temporal change in oxygen fugacity and gaseous species in asteroid Ryugu",
    "authors": [
      { "family": "Fujiya", "initials": "W." }
    ],
    "authorCount": 89,
    "year": 2023,
    "journal": "Nature Geoscience",
    "volume": "16",
    "pages": "675–682",
    "doi": "10.1038/s41561-023-01226-y",
    "summary": "Carbon isotope and oxygen isotope constraints on calcite and dolomite formation during Ryugu aqueous alteration.",
    "relevance": "A returned-sample comparison: Ryugu carbonate isotopes that record changing redox and gas conditions during alteration.",
    "tags": [
      "Ryugu",
      "Carbonates",
      "Isotopes"
    ]
  },
  {
    "id": "johnson-prinz-1993",
    "legacyAnchor": "paper-4",
    "primaryFilter": "dolomite",
    "filters": [
      "dolomite",
      "ci-orgueil",
      "methods"
    ],
    "title": "Carbonate compositions in CM and CI chondrites and implications for aqueous alteration",
    "authors": [
      { "family": "Johnson", "initials": "C. A." },
      { "family": "Prinz", "initials": "M." }
    ],
    "authorCount": 2,
    "year": 1993,
    "journal": "Geochimica et Cosmochimica Acta",
    "volume": "57",
    "pages": "2843–2852",
    "doi": "10.1016/0016-7037(93)90393-B",
    "summary": "Comparative carbonate chemistry in CM and CI chondrites and implications for low-temperature aqueous alteration.",
    "relevance": "Published carbonate compositions in CI and CM chondrites, a reference for comparing Ca–Mg carbonate chemistry.",
    "tags": [
      "CM/CI",
      "Carbonate chemistry",
      "Aqueous alteration"
    ]
  },
  {
    "id": "endress-bischoff-1996",
    "legacyAnchor": "paper-5",
    "primaryFilter": "ci-orgueil",
    "filters": [
      "dolomite",
      "ci-orgueil"
    ],
    "title": "Carbonates in CI chondrites: Clues to parent body evolution",
    "authors": [
      { "family": "Endreß", "initials": "M." },
      { "family": "Bischoff", "initials": "A." }
    ],
    "authorCount": 2,
    "year": 1996,
    "journal": "Geochimica et Cosmochimica Acta",
    "volume": "60",
    "pages": "489–507",
    "doi": "10.1016/0016-7037(95)00399-1",
    "summary": "Petrographic, mineralogical, and chemical constraints on CI carbonates, brecciation, and parent-body evolution.",
    "relevance": "Carbonate petrography in CI chondrites, linked to brecciation and parent-body history.",
    "tags": [
      "CI chondrite",
      "Parent body",
      "Carbonates"
    ]
  },
  {
    "id": "nakamura-2023",
    "legacyAnchor": "paper-6",
    "primaryFilter": "ryugu-bennu",
    "filters": [
      "ryugu-bennu"
    ],
    "title": "Formation and evolution of carbonaceous asteroid Ryugu: Direct evidence from returned samples",
    "authors": [
      { "family": "Nakamura", "initials": "T." }
    ],
    "authorCount": 221,
    "year": 2023,
    "journal": "Science",
    "volume": "379",
    "articleNumber": "eabn8671",
    "doi": "10.1126/science.abn8671",
    "summary": "Returned-sample constraints on Ryugu formation, aqueous alteration, impact disruption, and reaccumulation history.",
    "relevance": "The proposed Ryugu formation history that the Origins sequence illustrates.",
    "tags": [
      "Ryugu",
      "Returned sample",
      "Aqueous alteration"
    ]
  },
  {
    "id": "zega-2025",
    "legacyAnchor": "paper-7",
    "primaryFilter": "ryugu-bennu",
    "filters": [
      "ryugu-bennu",
      "methods"
    ],
    "title": "Mineralogical evidence for hydrothermal alteration of Bennu samples",
    "authors": [
      { "family": "Zega", "initials": "T. J." },
      { "family": "McCoy", "initials": "T. J." }
    ],
    "authorCount": 73,
    "year": 2025,
    "journal": "Nature Geoscience",
    "volume": "18",
    "pages": "832–839",
    "doi": "10.1038/s41561-025-01741-0",
    "summary": "Detailed mineralogical evidence for low-temperature aqueous alteration in Bennu samples.",
    "relevance": "Returned-sample mineralogy from Bennu, a comparison set for alteration conditions.",
    "tags": [
      "Bennu",
      "Hydrothermal alteration",
      "TEM/XRD"
    ]
  },
  {
    "id": "fujiya-2013",
    "legacyAnchor": "paper-8",
    "primaryFilter": "chronology",
    "filters": [
      "dolomite",
      "ci-orgueil",
      "chronology"
    ],
    "title": "Mn–Cr ages of dolomites in CI chondrites and the Tagish Lake ungrouped carbonaceous chondrite",
    "authors": [
      { "family": "Fujiya", "initials": "W." }
    ],
    "authorCount": 4,
    "year": 2013,
    "journal": "Earth and Planetary Science Letters",
    "volume": "362",
    "pages": "130–142",
    "doi": "10.1016/j.epsl.2012.11.057",
    "summary": "Chronological constraints on dolomite formation and aqueous alteration in hydrous asteroids.",
    "relevance": "Published Mn–Cr ages of CI dolomites: a timing constraint on aqueous alteration of the CI parent body.",
    "tags": [
      "Mn–Cr",
      "Dolomite ages",
      "Chronology"
    ]
  },
  {
    "id": "singerling-2025",
    "legacyAnchor": "paper-9",
    "primaryFilter": "ryugu-bennu",
    "filters": [
      "dolomite",
      "ryugu-bennu"
    ],
    "title": "Na,Ca carbonates in OSIRIS-REx samples: Evidence for low-temperature, Na-bearing brines on Bennu’s parent body",
    "authors": [
      { "family": "Singerling", "initials": "S. A." }
    ],
    "authorCount": 8,
    "year": 2025,
    "journal": "Geochimica et Cosmochimica Acta",
    "volume": "404",
    "pages": "86–92",
    "doi": "10.1016/j.gca.2025.06.028",
    "summary": "Nanoscale observations of Na,Ca carbonates in Bennu and implications for low-temperature briny fluids.",
    "relevance": "A Bennu comparison: Na-bearing carbonates read as a record of low-temperature brines.",
    "tags": [
      "Bennu",
      "Na,Ca carbonate",
      "Brines"
    ]
  },
  {
    "id": "pilorget-2025",
    "legacyAnchor": "paper-10",
    "primaryFilter": "ryugu-bennu",
    "filters": [
      "ryugu-bennu",
      "methods"
    ],
    "title": "Bennu and Ryugu constituents from samples IR analyses and potential source of terrestrial planets’ ingredients",
    "authors": [
      { "family": "Pilorget", "initials": "C." }
    ],
    "authorCount": 27,
    "year": 2025,
    "journal": "Nature Communications",
    "volume": "16",
    "articleNumber": "9532",
    "doi": "10.1038/s41467-025-65438-z",
    "summary": "Near-IR comparison of Bennu and Ryugu samples and their shared phyllosilicate-rich, carbonate-bearing characteristics.",
    "relevance": "Infrared comparison of Bennu and Ryugu samples and the constituents they share.",
    "tags": [
      "Bennu/Ryugu",
      "IR",
      "Sample return"
    ]
  },
  {
    "id": "lee-nicholson-2009",
    "legacyAnchor": "paper-11",
    "primaryFilter": "ci-orgueil",
    "filters": [
      "dolomite",
      "ci-orgueil",
      "methods"
    ],
    "title": "Ca-carbonate in the Orgueil (CI) carbonaceous chondrite: Mineralogy, microstructure and implications for parent body history",
    "authors": [
      { "family": "Lee", "initials": "M. R." },
      { "family": "Nicholson", "initials": "K." }
    ],
    "authorCount": 2,
    "year": 2009,
    "journal": "Earth and Planetary Science Letters",
    "volume": "280",
    "pages": "268–275",
    "doi": "10.1016/j.epsl.2009.01.038",
    "summary": "Microstructure and mineralogical context of Ca-carbonate in Orgueil and implications for parent-body regolith history.",
    "relevance": "Ca-carbonate (calcite) microstructure in Orgueil itself: direct published context for the meteorite I study.",
    "tags": [
      "Orgueil",
      "Calcite",
      "Microstructure"
    ]
  }
] as const;

export type PaperFilter = "dolomite" | "ci-orgueil" | "ryugu-bennu" | "methods" | "chronology";

export interface PaperAuthor {
  readonly family: string;
  readonly initials: string;
}

export interface PaperRecord {
  readonly id: string;
  readonly legacyAnchor?: string;
  readonly primaryFilter: PaperFilter;
  readonly filters: readonly PaperFilter[];
  readonly title: string;
  readonly authors: readonly PaperAuthor[];
  readonly authorCount: number;
  readonly year: number;
  readonly journal: string;
  readonly volume?: string;
  readonly pages?: string;
  readonly articleNumber?: string;
  readonly doi?: string;
  readonly url?: string;
  readonly summary: string;
  readonly relevance: string;
  readonly tags: readonly string[];
}

// Filter buttons and shelf groups share this order and these labels.
export const paperCategories: readonly { readonly id: PaperFilter; readonly label: string }[] = [
  { id: "dolomite", label: "Dolomite" },
  { id: "ci-orgueil", label: "CI / Orgueil" },
  { id: "ryugu-bennu", label: "Ryugu / Bennu" },
  { id: "methods", label: "Methods" },
  { id: "chronology", label: "Chronology" }
];

const records: readonly PaperRecord[] = papers;

/** "King et al.", "Johnson & Prinz" or a single surname. */
export function paperAuthorLabel(paper: PaperRecord): string {
  const [first, second] = paper.authors;
  if (paper.authorCount === 2 && second) return `${first.family} & ${second.family}`;
  return paper.authorCount > 1 ? `${first.family} et al.` : first.family;
}

/** "King et al. (2015)" */
export function paperAuthorYear(paper: PaperRecord): string {
  return `${paperAuthorLabel(paper)} (${paper.year})`;
}

export function paperHref(paper: PaperRecord): string {
  if (paper.doi) return `https://doi.org/${paper.doi}`;
  return paper.url ?? "";
}

/** "165, 148–160": volume, then pages or article number. */
export function paperIssue(paper: PaperRecord): string {
  return [paper.volume, paper.pages ?? paper.articleNumber].filter(Boolean).join(", ");
}

/** "Geochimica et Cosmochimica Acta 165, 148–160" */
export function paperSource(paper: PaperRecord): string {
  const issue = paperIssue(paper);
  return issue ? `${paper.journal} ${issue}` : paper.journal;
}

function referenceAuthors(paper: PaperRecord): string {
  const names = paper.authors.map((author) => `${author.family}, ${author.initials}`);
  if (paper.authorCount === 2 && names.length === 2) return `${names[0]} & ${names[1]}`;
  return paper.authorCount > 1 ? `${names[0]} et al.` : names[0];
}

/** "King, A. J. et al. (2015). Title. Journal Volume, Pages. https://doi.org/…" */
export function paperReference(paper: PaperRecord): string {
  const title = /[.?!]$/.test(paper.title) ? paper.title : `${paper.title}.`;
  const href = paperHref(paper);
  return [`${referenceAuthors(paper)} (${paper.year}).`, title, `${paperSource(paper)}.`, href].filter(Boolean).join(" ");
}

/** Shelf groups in category order; each group's papers by year, then first author. */
export function paperGroups() {
  return paperCategories
    .map((category) => ({
      ...category,
      papers: records
        .filter((paper) => paper.primaryFilter === category.id)
        .slice()
        .sort((a, b) => a.year - b.year || a.authors[0].family.localeCompare(b.authors[0].family, "en"))
    }))
    .filter((group) => group.papers.length > 0);
}
