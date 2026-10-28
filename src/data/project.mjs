// Project facts for the graduation research "Dolomite in Orgueil CI1".
//
// This is the one source for the public project facts. It feeds Home (src/components/CurrentFocus.astro),
// Research and Research Log (src/components/AnalyticalPathway.astro and the page sources), the protected
// graduation page (project context and pathway only, never Mission Log entries), the public research atlas
// (src/components/EvidenceAtlasData.astro -> public/assets/js/mineral-interactions.js) and
// scripts/export-ppt-data.mjs.
//
// It is a plain ES module with JSDoc types, so Astro pages and Node scripts import it without flags.
// Public prose is English. Keep the evidence calibrated: Ca–Mg carbonates are "reported as dolomite" or
// candidates until structural evidence exists, and planned EBSD, FIB, single-grain XRD and TEM work is
// never described as completed.

/** @typedef {'In progress' | 'Next' | 'Planned' | 'Interpretation'} PathwayStatus */

/**
 * @typedef {object} Technique Atlas quick-view entry for a method, with an external method reference.
 * @property {string} title Heading in the atlas; starts with the method abbreviation.
 * @property {string} href Method reference.
 * @property {string} linkLabel Link text for the method reference.
 */

/**
 * @typedef {object} PathwayStep
 * @property {string} id Stable slug.
 * @property {string} title Step title, as published since the pathway was introduced.
 * @property {string} purpose One sentence: what the step does.
 * @property {string} canAnswer What it can answer.
 * @property {string} cannotEstablish What it cannot establish.
 * @property {PathwayStatus} status Set by the owner; see `statusAsOf`.
 * @property {string} [methodLabel] Label used in `methodsSummary`.
 * @property {Technique} [technique] Present when the step has a method entry in the research atlas.
 */

/** Stable project label, also the Mission Log `questionShort`. */
export const questionShort = 'Dolomite in Orgueil CI1';

/** Canonical research question (CLAUDE.md wording). Short headings may stay short; the full question is always this. */
export const question = 'What controlled dolomite formation in the Orgueil CI1 chondrite?';

/** Concise display title of the project (Research Log). */
export const displayTitle = 'Dolomite in the Orgueil CI1 Chondrite';

/** Formal research title. */
export const formalTitle = 'Astromineralogical Study of Ca–Mg Carbonates Reported as Dolomite in the Orgueil CI1 Chondrite: Crystallographic Identification and Implications for Parent-Body Aqueous Alteration';

export const period = '2026/04 – present';
export const projectStatus = 'Ongoing';

export const laboratories = Object.freeze([
  Object.freeze({ name: 'Mineralogy Laboratory', institution: 'Waseda University', adviser: 'Taiga Okumura' }),
  Object.freeze({ name: 'Mikouchi Laboratory', institution: 'The University Museum, The University of Tokyo', adviser: 'Takashi Mikouchi' })
]);

export const targetMaterial = 'Orgueil CI1 chondrite';
export const targetPhase = 'Ca–Mg carbonates reported as dolomite';
export const broaderContext = 'Primitive Solar System materials, aqueous alteration, and the dolomite problem';

/** Home Current Focus paragraph. */
export const focusSummary = 'My current graduation research investigates Ca–Mg carbonates reported as dolomite in the Orgueil CI1 chondrite as a mineralogical record of how primitive Solar System materials were altered by water on their parent body. The project examines their morphology, chemical composition, and spatial relation to clay minerals, and tests whether their crystal structure confirms dolomite, aiming to constrain formation conditions from micro- to nanometre scales.';

/** Project context on the protected graduation page. */
export const projectContext = Object.freeze([
  'This project investigates Ca–Mg carbonates reported as dolomite in the Orgueil CI1 chondrite at micro- to nanometre scales. It examines their morphology, chemical composition, and spatial relationship with clay-rich regions, and tests whether their crystal structure confirms dolomite. The aim is to constrain their formation conditions during parent-body aqueous alteration.',
  'SEM–EDS and EPMA observations are under way. Next, EBSD is planned to select and orient regions for focused ion beam (FIB) preparation; FIB sections will then be examined by TEM, and a FIB-prepared grain by single-grain XRD. Together these methods are intended to connect occurrence, morphology, chemical composition, and crystal structure.'
]);

/** Material summary for the research atlas. */
export const materialSummary = 'A meteorite record of water–rock interaction. This project studies Ca–Mg carbonates reported as dolomite and their relationship to the surrounding clay-rich material.';

/** The three sub-questions under the research question. */
export const subQuestions = Object.freeze([
  Object.freeze({ title: 'Where did the crystals grow?', text: 'Do the carbonate grains touch clay minerals, fill spaces, or replace earlier material? Textures help test these possibilities.' }),
  Object.freeze({ title: 'What can the crystals tell us about water?', text: 'Does their crystal structure confirm dolomite, and can their chemical composition and structure constrain the conditions of water–rock interaction on the parent body?' }),
  Object.freeze({ title: 'Did clay surfaces influence growth?', text: 'Do mineral contacts preserve evidence of a relationship between clay surfaces and carbonate growth? A nearby grain alone does not establish how it formed.' })
]);

/**
 * Status of the Analytical Pathway while the plan is still under discussion: all seven steps owner-confirmed for
 * October 2026 (step 01, Sample selection, confirmed on 2026-10-28).
 * Statuses are set by the owner. Never raise a step to "Completed" (or add that status) without the owner's
 * explicit confirmation; scripts/project-facts.test.mjs fails on it.
 */
export const statusAsOf = 'October 2026';

/** @type {readonly PathwayStatus[]} */
export const pathwayStatuses = Object.freeze(['In progress', 'Next', 'Planned', 'Interpretation']);

/** @type {readonly PathwayStep[]} */
export const pathway = Object.freeze([
  {
    id: 'sample-selection',
    title: 'Sample selection',
    purpose: 'Identify suitable Orgueil CI1 material and carbonate-bearing regions.',
    canAnswer: 'Which sections and areas hold carbonate candidates in their clay-rich matrix, so that later analyses target the intended grains and contacts.',
    cannotEstablish: 'Selection identifies no mineral: a chosen region holds candidates, not confirmed dolomite. A few sections may not represent the whole meteorite.',
    status: 'In progress'
  },
  {
    id: 'sem-bse',
    title: 'SEM / BSE',
    purpose: 'Document morphology, texture and spatial relations to clay-rich areas.',
    canAnswer: 'Where are the grains, what shapes do they have, and how do they meet the surrounding material? Electron images reveal textures; EDS can screen elemental composition.',
    cannotEstablish: 'Brightness alone cannot identify dolomite. EDS signals can mix adjacent phases and do not establish crystal structure.',
    status: 'In progress',
    methodLabel: 'SEM–EDS',
    technique: { title: 'SEM / Scanning electron microscopy', href: 'https://serc.carleton.edu/research_education/geochemsheets/techniques/SEM.html', linkLabel: 'SEM method reference' }
  },
  {
    id: 'epma-mapping',
    title: 'EPMA mapping',
    purpose: 'Constrain elemental distribution and carbonate chemistry.',
    canAnswer: 'How much Ca, Mg, Fe and other measured elements are present, and how does composition vary across a grain?',
    cannotEstablish: 'Small grains or inclusions can yield mixed analyses. Quantitative chemistry needs standards and corrections; chemistry alone, including a Ca/Mg ratio near 1:1, does not establish atomic ordering.',
    status: 'In progress',
    methodLabel: 'EPMA',
    technique: { title: 'EPMA / Electron probe microanalysis', href: 'https://www.dal.ca/sites/electron-microprobe-lab/analysis/drg4.html', linkLabel: 'EPMA method reference' }
  },
  {
    id: 'ebsd-fib',
    title: 'EBSD-guided FIB preparation',
    purpose: 'EBSD mapping will be used to select and orient regions for focused ion beam (FIB) sections and a single grain.',
    canAnswer: 'Which crystalline grains and contacts are suitable for structural work, and how they are oriented, so that FIB sections and a single grain can be cut from the intended regions.',
    cannotEstablish: 'Preparation selects and shapes material; it is not a structural result. Fine-grained or poorly polished areas may give weak patterns, and a FIB section samples only a small part of a grain.',
    status: 'Next',
    methodLabel: 'EBSD-guided FIB preparation'
  },
  {
    id: 'single-grain-xrd',
    title: 'Single-grain XRD',
    purpose: 'A FIB-prepared grain will be used to test crystal structure and carbonate ordering.',
    canAnswer: 'Which crystal structure is present? Single-grain diffraction can test lattice parameters and atomic ordering.',
    cannotEstablish: 'A suitable crystalline grain and usable diffraction are required; here the grain is planned to be prepared by focused ion beam (FIB). Mixed phases or weak diffraction complicate interpretation, and diffraction does not by itself explain a growth history.',
    status: 'Planned',
    methodLabel: 'single-grain XRD',
    technique: { title: 'XRD / X-ray diffraction', href: 'https://serc.carleton.edu/research_education/geochemsheets/techniques/SXD.html', linkLabel: 'XRD method reference' }
  },
  {
    id: 'tem',
    title: 'TEM / EDS / diffraction',
    purpose: 'FIB sections will be examined for nanoscale interfaces, defects and local structure.',
    canAnswer: 'What happens at the nanometre-scale contact between minerals? Imaging and electron diffraction can examine local structure and orientation.',
    cannotEstablish: 'An electron-transparent specimen requires preparation; FIB sections from regions selected and oriented by EBSD are planned. The observed region is very small, so it must be related back to the wider texture.',
    status: 'Planned',
    methodLabel: 'TEM',
    technique: { title: 'TEM / Transmission electron microscopy', href: 'https://www.nlr.gov/materials-science/transmission-electron-microscopy', linkLabel: 'TEM method reference' }
  },
  {
    id: 'formation-conditions',
    title: 'Formation conditions',
    purpose: 'Integrate the observations to discuss formation conditions during parent-body aqueous alteration.',
    canAnswer: 'Whether texture, chemistry and structure together favour particular settings, such as growth into open space, replacement of earlier material or growth on clay surfaces.',
    cannotEstablish: 'This is an interpretation, not a measurement. Without independent constraints it cannot fix temperature, fluid composition or timing, and it does not identify Orgueil’s parent body.',
    status: 'Interpretation'
  }
].map(step => Object.freeze({ ...step, ...(step.technique ? { technique: Object.freeze(step.technique) } : {}) })));

/**
 * Methods with their current status, derived from the pathway so the two cannot drift:
 * "SEM–EDS and EPMA in progress · EBSD-guided FIB preparation next · single-grain XRD and TEM planned".
 */
export const methodsSummary = ['In progress', 'Next', 'Planned']
  .map(status => {
    const labels = pathway.filter(step => step.status === status && step.methodLabel).map(step => step.methodLabel);
    return labels.length ? `${labels.join(' and ')} ${status.toLowerCase()}` : '';
  })
  .filter(Boolean)
  .join(' · ');

/** Methods in pathway order without status, for compact labels. */
export const methodsShort = 'SEM–EDS / EPMA · single-grain XRD · FIB–TEM';

/** What each material can and cannot show. Ryugu and Bennu are comparison materials only. */
export const comparisonMaterials = Object.freeze({
  orgueil: Object.freeze({
    label: 'Research material',
    title: 'Orgueil CI1 chondrite',
    canShow: 'Textures, chemistry and, with the planned structural work, the crystal structure of Ca–Mg carbonate candidates within an aqueously altered, clay-rich CI1 matrix.',
    cannotShow: 'Its parent body is unknown. Orgueil fell in 1864 and has been on Earth since, so terrestrial alteration has to be separated from parent-body features.'
  }),
  returned: Object.freeze({
    label: 'Comparison materials',
    title: 'Ryugu and Bennu returned samples',
    canShow: 'Material collected directly from two known asteroids and curated to limit terrestrial contamination. Published studies report aqueously altered material with carbonates, an independent reference for the mineral record of water.',
    cannotShow: 'Similar minerals do not establish that Orgueil came from Ryugu, Bennu or a related body. On this site they appear through published mission data and microscopy.'
  })
});

/** Plain-object view for the research atlas JSON (EvidenceAtlasData.astro). */
export function atlasProjectData() {
  return {
    question,
    questionShort,
    materialSummary,
    methodsShort,
    statusAsOf,
    subQuestions: subQuestions.map(item => ({ ...item })),
    methods: pathway.filter(step => step.technique).map(step => ({
      title: step.technique.title,
      answer: step.canAnswer,
      limitation: step.cannotEstablish,
      status: step.status,
      href: step.technique.href,
      linkLabel: step.technique.linkLabel
    }))
  };
}
