// Home page source data (src/pages/index.astro). The research question and Current Focus come from
// src/data/project.mjs; this file holds the rest of the page's text.
//
// - keywords: the words of the former interest pills, unchanged and in their order. Home sets them as one
//   "Keywords: …" line; scripts/check-site/research.mjs holds the built line to this list.
// - explore: the onward routes, numbered in the hanging margin. A detail is text, with { struck } for a word set
//   crossed out (Photography keeps its struck-through camera).
// - timeline: the academic timeline, newest last; the full record is on the CV.

export const affiliations = [
  "Department of Earth Sciences, School of Education, Waseda University",
  "External Research Student, The University Museum, The University of Tokyo"
] as const;

export const interests =
  "My main research interests are Astromineralogy and Planetology, with a focus on primitive Solar System materials, meteorites, and mineralogical records preserved in asteroid-returned samples.";

export const keywords = [
  "Astromineralogy",
  "Planetology",
  "CI Chondrite",
  "Ryugu / Bennu",
  "Astromaterials Science",
  "SEM–EDS / EPMA · XRD · FIB–TEM"
] as const;

export type DetailPart = string | { struck: string };

export const explore: readonly { number: string; title: string; href: string; detail: readonly DetailPart[] }[] = [
  {
    number: "01",
    title: "Ryugu & Bennu",
    href: "ryugu-bennu.html",
    detail: ["Sample-return missions and published microscopy of asteroids Ryugu and Bennu, read as comparison materials."]
  },
  {
    number: "02",
    title: "Origins",
    href: "origins-study.html",
    detail: ["An interactive, illustrative model of dust, ice, water and rock in an evolving asteroid parent body."]
  },
  {
    number: "03",
    title: "Research Log",
    href: "research-log.html",
    detail: ["Chronological notes on my graduation research; the detailed Mission Log is protected."]
  },
  {
    number: "04",
    title: "Paper Shelf",
    href: "paper-shelf.html",
    detail: ["A curated reading shelf on dolomite, carbonates, CI chondrites, Ryugu, Bennu and analytical methods."]
  },
  {
    number: "05",
    title: "Photography",
    href: "photography.html",
    detail: ["Film-inspired photographs and visual notes made with ", { struck: "Hasselblad X2D" }, " Pentax 6×7."]
  }
];

export const timeline: readonly { date: string; title: string }[] = [
  { date: "2023/04", title: "Entered Waseda University, Department of Earth Sciences." },
  { date: "2025/04", title: "Joined the Mineralogy Laboratory at Waseda University as a third-year undergraduate student. Adviser: Taiga Okumura." },
  { date: "2025/09", title: "Joined the Mikouchi Laboratory at The University Museum, The University of Tokyo, as a third-year undergraduate student. Adviser: Takashi Mikouchi." },
  { date: "2026/04", title: "Started graduation research jointly at the Mineralogy Laboratory and the Mikouchi Laboratory as a fourth-year undergraduate student." }
];
