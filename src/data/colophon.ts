// The footer colophon (SiteFooter.astro, spec §3.2): the imprint, the edition and how the site is made. The revision
// date between "Rev." and the type line is not written here: it is the committer date of the build's HEAD
// (src/lib/revision.ts), so it moves with every published change and never needs editing by hand.
export const colophon = {
  imprint: "Interface 2046",
  edition: "Calibrated edition",
  revisionLabel: "Rev.",
  type: "Set in Montserrat and Georgia",
  build: "Built with Astro, hosted on GitHub Pages",
  // The footer credits the pictures shown on its page (owner, 2026-11-28): the band's montage is on every page; Bennu
  // and each item of imagery name their pages (the page key: SiteShell's pageClass, else current), and soft navigation
  // swaps the credit line with main (legacy-navigation.js). Each picture is credited as its source asks, with its
  // author, source page, licence and changes; a share-alike image says that the version shown keeps the licence.
  // The backdrops (components/backdrop.css: one per page since 2026-11-28) and the context plates (components/plate.css)
  // are listed in page order (Home, Research, Ryugu & Bennu, Origins, Research Log, Paper Shelf, CV, Photography,
  // Contact, 404, the protected Research Log); Comet McNaught prints the Home opening (pages/home-opening.css) and Comet
  // West is Home's backdrop behind the sheet (owner, 2026-11-28).
  // Dates and places are in the plates' captions, docs/image-inventory.md and
  // public/assets/img/{backdrops,plates,opening}/PROVENANCE.md.
  credits: {
    label: "Image credits",
    bennu: { text: "asteroid Bennu photograph, NASA/Goddard/University of Arizona", pages: ["research"] },
    montage: {
      lead: "Solar System montage",
      title: "Solar System true color",
      author: "CactiStaccingCrane",
      source: { label: "Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Solar_System_true_color.jpg" },
      licence: { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
      changes: "cropped and toned"
    },
    imagery: {
      lead: "Backdrops and figures",
      items: [
        { title: "Comet McNaught", author: "S. Deiries/ESO", source: "https://www.eso.org/public/images/mc_naught34/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped and toned (Home opening)", pages: ["home"] },
        { title: "Comet West, March 1976", author: "P. Stättmayer/ESO", source: "https://www.eso.org/public/images/c-west-mar1976-ps/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped and toned (Home backdrop)", pages: ["home"] },
        { title: "Orgueil meteorite, MNHN Paris", author: "Eunostos (Wikimedia Commons)", source: "https://commons.wikimedia.org/wiki/File:M%C3%A9t%C3%A9orite_Orgueil,_exposition_M%C3%A9t%C3%A9orites,_Mus%C3%A9um_national_d%27histoire_naturelle_de_Paris.jpg", licence: { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" }, changes: "cropped", shareAlike: true, pages: ["research"] },
        { title: "Asteroid Ryugu (Hayabusa2 ONC-T, 11 September 2018)", author: "ISAS/JAXA; image processed by Anonymsiy (Wikimedia Commons)", source: "https://commons.wikimedia.org/wiki/File:162173_Ryugu.png", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped and toned", pages: ["ryugu-bennu"] },
        { title: "The Cosmic Cliffs in Carina (NIRCam)", author: "NASA, ESA, CSA, and STScI", source: "https://esawebb.org/images/weic2205a/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped and toned", pages: ["origins"] },
        { title: "HL Tauri disc", author: "ALMA (ESO/NAOJ/NRAO)", source: "https://www.eso.org/public/images/eso1436a/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped", pages: ["origins"] },
        { title: "Comet NEOWISE", author: "SimgDe (simg.de, Wikimedia Commons)", source: "https://commons.wikimedia.org/wiki/File:Comet_2020_F3_(NEOWISE)_on_Jul_14_2020_aligned_to_comet.jpg", licence: { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" }, changes: "toned", shareAlike: true, pages: ["research-log"] },
        { title: "The Great Nebula in Orion", author: "E. L. Trouvelot (from The New York Public Library)", source: "https://commons.wikimedia.org/wiki/File:Trouvelot-_The_great_nebula_in_Orion_-_1875.jpg", licence: { label: "public domain" }, changes: "cropped and toned", pages: ["paper-shelf"] },
        { title: "The Great Comet of 1881", author: "E. L. Trouvelot (scan: University of Michigan Library)", source: "https://commons.wikimedia.org/wiki/File:Trouvelot_-_The_great_comet_of_1881_-_1881.jpg", licence: { label: "public domain" }, changes: "cropped", pages: ["paper-shelf"] },
        { title: "Part of the Milky Way", author: "E. L. Trouvelot (from The New York Public Library)", source: "https://commons.wikimedia.org/wiki/File:Trouvelot_-_Part_of_the_Milky_Way.jpg", licence: { label: "public domain" }, changes: "cropped and toned", pages: ["cv"] },
        { title: "The Milky Way panorama", author: "ESO/S. Brunier", source: "https://www.eso.org/public/images/eso0932a/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped and toned", pages: ["photography"] },
        { title: "Comet 12P/Pons-Brooks", author: "Don Heffernan (Flickr)", source: "https://commons.wikimedia.org/wiki/File:12P_Pons-Brooks_(53635474808).jpg", licence: { label: "CC BY 2.0", url: "https://creativecommons.org/licenses/by/2.0/" }, changes: "cropped and toned", pages: ["contact"] },
        { title: "Barnard 68, the dark cloud", author: "ESO", source: "https://www.eso.org/public/images/eso9924a/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped and toned", pages: ["not-found"] },
        { title: "Comet Hale-Bopp", author: "ESO/E. Slawik", source: "https://www.eso.org/public/images/phot-mar14-hbs-2/", licence: { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, changes: "cropped", pages: ["not-found"] },
        { title: "The November Meteors", author: "E. L. Trouvelot (from The New York Public Library)", source: "https://commons.wikimedia.org/wiki/File:Trouvelot-_The_November_meteors._-_1868.jpg", licence: { label: "public domain" }, changes: "cropped and toned", pages: ["research-graduation"] }
      ]
    }
  }
} as const;
