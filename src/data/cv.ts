// CV source data for src/pages/cv.astro (education, research experience, interests, skills).
//
// The page sets each list of entries as a ledger with hanging dates. An entry's details are paragraphs in order:
// - text: a string, or several strings for lines that break (an address over two lines);
// - label: a lead-in set in bold before the text ("Adviser: Takashi Mikouchi");
// - muted: a secondary line (a place).
// Keep wording as published; planned work stays marked "Planned".
export interface CvDetail {
  readonly text: string | readonly string[];
  readonly label?: string;
  readonly muted?: boolean;
}

export interface CvEntry {
  readonly date: string;
  readonly title: string;
  readonly details: readonly CvDetail[];
}

export const education: readonly CvEntry[] = [
  {
    date: "2025/09 – present",
    title: "External Research Student, The University Museum, The University of Tokyo",
    details: [
      { text: "Astromineralogy · Planetology · Meteoritics · Astromaterials Science" },
      { label: "Adviser", text: "Takashi Mikouchi" },
      {
        text: "Research training in astromineralogy, planetology, and meteoritics. In parallel, I conduct my undergraduate graduation research across the Mineralogy Laboratory at Waseda University and the Mikouchi Laboratory at The University Museum, The University of Tokyo."
      }
    ]
  },
  {
    date: "2023/04 – present",
    title: "B.Sc. studies in Earth Sciences, Waseda University",
    details: [
      { text: ["Department of Earth Sciences, School of Education, Waseda University", "Mineralogy Laboratory"] },
      { label: "Adviser", text: "Taiga Okumura" },
      {
        text: "Undergraduate training in Earth sciences, mineralogy, geochemistry, planetary science, physics, field geology, and analytical methods."
      }
    ]
  },
  {
    date: "2018/09 – 2021/06",
    title: "East China Model High School",
    details: [{ text: "Shanghai, China", muted: true }]
  },
  {
    date: "2014/09 – 2018/06",
    title: "Shanghai Nanyang Model Junior High School",
    details: [{ text: "Shanghai, China", muted: true }]
  }
];

export const researchExperience: readonly CvEntry[] = [
  {
    date: "2026/04 – present",
    title: "Undergraduate graduation research",
    details: [
      {
        text: "Ordered Dolomite in the Orgueil CI1 Chondrite: An Astromineralogical Study of Its Composition, Structure and Low-Temperature Formation during Parent-Body Aqueous Alteration"
      },
      { text: ["Mineralogy Laboratory, Waseda University", "Mikouchi Laboratory, The University Museum, The University of Tokyo"] },
      { label: "Advisers", text: "Taiga Okumura; Takashi Mikouchi" },
      {
        text: "SEM–EDS and EPMA observation of Ca–Mg carbonates and the surrounding clay-rich matrix. Planned: EBSD-guided FIB preparation for TEM and single-grain XRD."
      }
    ]
  }
];

export const interests: readonly string[] = [
  "Astromineralogy",
  "Planetology",
  "Meteorites and carbonaceous chondrites",
  "Ryugu and Bennu samples",
  "Mineralogy of primitive Solar System materials",
  "Electron microscopy and microanalysis"
];

export const skills: readonly string[] = [
  "Mineralogical description and petrographic observation",
  "SEM and EPMA-based observation and elemental analysis",
  "XRD, FT-IR, and basic laboratory data interpretation",
  "Scientific reading, presentation, and report writing",
  "Field geology, structural observation, and geological reporting"
];
