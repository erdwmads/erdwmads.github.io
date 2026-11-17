// The footer colophon (SiteFooter.astro, spec §3.2): the imprint, the edition and how the site is made. The revision
// date between "Rev." and the type line is not written here: it is the committer date of the build's HEAD
// (src/lib/revision.ts), so it moves with every published change and never needs editing by hand.
export const colophon = {
  imprint: "Interface 2046",
  edition: "Calibrated edition",
  revisionLabel: "Rev.",
  type: "Set in Source Serif 4 and Source Sans 3",
  build: "Built with Astro, hosted on GitHub Pages"
} as const;
