// The footer colophon (SiteFooter.astro, spec §3.2): the imprint, the edition and how the site is made. The revision
// date between "Rev." and the type line is not written here: it is the committer date of the build's HEAD
// (src/lib/revision.ts), so it moves with every published change and never needs editing by hand.
export const colophon = {
  imprint: "Interface 2046",
  edition: "Calibrated edition",
  revisionLabel: "Rev.",
  type: "Set in Source Serif 4 and Source Sans 3",
  build: "Built with Astro, hosted on GitHub Pages",
  // The two page backdrops (components/backdrop.css), credited as their sources ask; the footer links the source
  // and the licence.
  credits: {
    label: "Image credits",
    bennu: "asteroid Bennu photograph, NASA/Goddard/University of Arizona",
    montage: {
      lead: "Solar System montage",
      title: "Solar System true color",
      author: "CactiStaccingCrane",
      source: { label: "Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Solar_System_true_color.jpg" },
      licence: { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
      changes: "cropped and toned"
    }
  }
} as const;
