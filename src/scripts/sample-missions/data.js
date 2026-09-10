// Historical dates and source event anchors; Earth-flight paths and attitude are explanatory.
// Scope ends at each original mission's sample return, before extended-mission exploration.
export const missions = {
  "hayabusa2": {
    "id": "hayabusa2",
    "title": "Hayabusa2",
    "agency": "JAXA",
    "target": "Ryugu",
    "targetId": "ryugu",
    "years": "2014–2020",
    "stages": [
      {
        "id": "launch",
        "kind": "launch",
        "label": "Launch",
        "date": "3 Dec 2014",
        "title": "Leaving Earth",
        "description": "An H-IIA rocket carries Hayabusa2 from Tanegashima toward a small, carbon-rich asteroid.",
        "detail": "The upper stage coasts in an initial Earth parking orbit, then restarts for escape. Event timing follows JAXA's postflight quick review; the displayed flight path is illustrative.",
        "source": "https://global.jaxa.jp/press/2014/12/20141203_h2af26.html",
        "sourceLabel": "JAXA · Postflight launch sequence"
      },
      {
        "id": "solar-cruise",
        "kind": "cruise",
        "label": "Solar cruise",
        "date": "2014–2015",
        "title": "A year around the Sun",
        "description": "Hayabusa2 follows a heliocentric orbit for about a year before returning to Earth for a gravity assist.",
        "detail": "The brief Earth parking coast belongs to launch. This later year-long journey circles the Sun while Earth also moves; the next chapter follows the close Earth flyby.",
        "sourceLabel": "Solar cruise and Earth swing-by",
        "source": "https://global.jaxa.jp/projects/sas/hayabusa2/orbit.html"
      },
      {
        "id": "flyby",
        "kind": "flyby",
        "label": "Earth flyby",
        "date": "3 Dec 2015",
        "title": "A lift from Earth",
        "description": "After about one year orbiting the Sun, Hayabusa2 returns to Earth for a gravity assist toward Ryugu.",
        "detail": "Earth-centered navigation vectors show approach, one close passage, and departure. Distances and model sizes share one physical scale. The position marker follows the route; spacecraft attitude is illustrative.",
        "source": "https://www.hayabusa2.jaxa.jp/topics/20151214_02_e/",
        "sourceLabel": "JAXA · Earth swing-by"
      },
      {
        "id": "outbound",
        "kind": "outbound",
        "label": "Asteroid transfer",
        "date": "2015–2018",
        "title": "Onward to Ryugu",
        "description": "After the Earth gravity assist, Hayabusa2 continues toward Ryugu on a changed heliocentric trajectory.",
        "detail": "The view returns to the Solar System scale. Continued cruise and navigation lead to the later rendezvous; this is an illustrative transfer.",
        "source": "https://www.hayabusa2.jaxa.jp/topics/20151214_02_e/",
        "sourceLabel": "JAXA · Earth swing-by"
      },
      {
        "id": "rendezvous",
        "kind": "rendezvous",
        "label": "Rendezvous",
        "date": "27 Jun 2018",
        "title": "Meeting Ryugu",
        "description": "Hayabusa2 arrives at Ryugu and begins close observations of its boulders, shape, and surface.",
        "detail": "The final approach reaches a home position about 20 km from the centre of Ryugu. The 6 m spacecraft is tiny beside the roughly 900 m asteroid. Camera close-ups preserve these dimensions.",
        "source": "https://www.isas.jaxa.jp/en/missions/spacecraft/current/hayabusa2.html",
        "sourceLabel": "JAXA · Mission overview"
      },
      {
        "id": "touchdown-1",
        "kind": "sample",
        "label": "First touchdown",
        "date": "22 Feb 2019 JST",
        "title": "A first touch",
        "description": "The sampler horn touches Ryugu. A small tantalum projectile strikes the surface, sending fragments up the horn before the spacecraft ascends.",
        "detail": "The first touchdown occurred on 21 February in UTC.",
        "source": "https://www.hayabusa2.jaxa.jp/en/topics/20190214e_Experiment/",
        "sourceLabel": "JAXA · Sampling mechanism"
      },
      {
        "id": "impact",
        "kind": "impact",
        "label": "Artificial crater",
        "date": "5 Apr 2019",
        "title": "Reaching beneath the surface",
        "description": "A separate Small Carry-on Impactor fires a copper projectile into Ryugu while Hayabusa2 shelters away from the impact site.",
        "detail": "The impact excavates a crater; a detached camera records the ejecta.",
        "source": "https://www.hayabusa2.jaxa.jp/en/topics/20200320_science/",
        "sourceLabel": "JAXA · SCI experiment"
      },
      {
        "id": "touchdown-2",
        "kind": "sample",
        "label": "Second touchdown",
        "date": "11 Jul 2019 JST",
        "title": "A second collection",
        "description": "Hayabusa2 touches down near the artificial crater, collecting material from an area reached by the impact ejecta.",
        "detail": "The sampler horn and a second tantalum projectile collect another sample.",
        "source": "https://www.hayabusa2.jaxa.jp/en/topics/20190711e_PPTD_ImageBulletin/",
        "sourceLabel": "JAXA · Second touchdown"
      },
      {
        "id": "departure",
        "kind": "depart",
        "label": "Departure",
        "date": "13 Nov 2019",
        "title": "Turning toward home",
        "description": "With both collections aboard, Hayabusa2 leaves Ryugu for the return journey to Earth.",
        "detail": "Departure begins from the vicinity of the 20 km home position. This continuous HPNAV prediction starts at 01:00 UTC, after a source-solution boundary. The moving marker follows the source trajectory; target-pointing attitude is illustrative.",
        "source": "https://www.isas.jaxa.jp/en/missions/spacecraft/current/hayabusa2.html",
        "sourceLabel": "JAXA · Mission overview"
      },
      {
        "id": "capsule-release",
        "kind": "return",
        "label": "Capsule separation",
        "date": "5 Dec 2020 JST",
        "title": "Two paths at Earth",
        "description": "Hayabusa2 releases its sample capsule toward Earth, then changes course to continue into space.",
        "detail": "The capsule is released about 220,000 km above Earth. About an hour later, Hayabusa2 begins its divert maneuver. This chapter follows the continuing approach; the next follows the capsule through atmospheric entry and landing.",
        "source": "https://www.hayabusa2.jaxa.jp/en/news/schedule/",
        "sourceLabel": "JAXA · Completed return schedule"
      },
      {
        "id": "recovery",
        "kind": "landing",
        "label": "Entry & landing",
        "date": "6 Dec 2020 · Australia",
        "title": "Ryugu reaches Earth",
        "description": "The capsule enters the atmosphere and descends under a parachute. Recovery teams retrieve it in the Woomera Prohibited Area, South Australia.",
        "detail": "The 40 cm capsule enters near 120 km altitude at about 12 km/s. Both heat shields separate before parachute descent near 10 km. Landing was 6 December locally and in JST, but 5 December in UTC; the locator marks the recovery region.",
        "source": "https://global.jaxa.jp/press/2020/12/20201206-1_e.html",
        "sourceLabel": "JAXA · Capsule recovery"
      }
    ],
    "sources": [
      {
        "label": "H-IIA F26 postflight launch sequence",
        "href": "https://global.jaxa.jp/press/2014/12/20141203_h2af26.html"
      },
      {
        "label": "Solar cruise and Earth swing-by",
        "href": "https://global.jaxa.jp/projects/sas/hayabusa2/orbit.html"
      },
      {
        "label": "JAXA mission chronology",
        "href": "https://www.isas.jaxa.jp/en/missions/spacecraft/current/hayabusa2.html"
      },
      {
        "label": "Earth flyby",
        "href": "https://www.hayabusa2.jaxa.jp/topics/20151214_02_e/"
      },
      {
        "label": "Sampler horn and projectile",
        "href": "https://www.hayabusa2.jaxa.jp/en/topics/20190214e_Experiment/"
      },
      {
        "label": "SCI impact experiment",
        "href": "https://www.hayabusa2.jaxa.jp/en/topics/20200320_science/"
      },
      {
        "label": "Second touchdown",
        "href": "https://www.hayabusa2.jaxa.jp/en/topics/20190711e_PPTD_ImageBulletin/"
      },
      {
        "label": "Capsule separation",
        "href": "https://www.hayabusa2.jaxa.jp/en/topics/20201209_project/"
      },
      {
        "label": "Completed capsule release, divert and landing schedule",
        "href": "https://www.hayabusa2.jaxa.jp/en/news/schedule/"
      },
      {
        "label": "Atmospheric entry, heat shields and parachute recovery",
        "href": "https://www.hayabusa2.jaxa.jp/en/topics/20201204_ts3/"
      },
      {
        "label": "Recovered capsule and cruciform parachute construction (PDF)",
        "href": "https://www.isas.jaxa.jp/topics/files/HY2-CPSL-TENJI_2022.pdf"
      },
      {
        "label": "Woomera recovery",
        "href": "https://global.jaxa.jp/press/2020/12/20201206-1_e.html"
      }
    ]
  },
  "osiris-rex": {
    "id": "osiris-rex",
    "title": "OSIRIS-REx",
    "agency": "NASA",
    "target": "Bennu",
    "targetId": "bennu",
    "years": "2016–2023",
    "stages": [
      {
        "id": "launch",
        "kind": "launch",
        "label": "Launch",
        "date": "8 Sep 2016",
        "title": "Setting out for Bennu",
        "description": "An Atlas V launches OSIRIS-REx from Cape Canaveral on a mission to bring asteroid material back to Earth.",
        "detail": "Centaur coasts in an initial Earth parking orbit, then restarts for escape. This animation uses NASA's nominal launch timeline; the displayed flight path and solar-array deployment are illustrative.",
        "source": "https://www.nasa.gov/wp-content/uploads/2016/06/osiris-rex_press_kit_0.pdf#page=5",
        "sourceLabel": "NASA · Nominal launch timeline (PDF)"
      },
      {
        "id": "solar-cruise",
        "kind": "cruise",
        "label": "Solar cruise",
        "date": "2016–2017",
        "title": "A year around the Sun",
        "description": "OSIRIS-REx follows a heliocentric orbit for about a year before returning to Earth for a gravity assist.",
        "detail": "The brief Earth parking coast belongs to launch. This later year-long journey circles the Sun while Earth also moves; the next chapter follows the close Earth flyby.",
        "sourceLabel": "Solar cruise and Earth gravity assist",
        "source": "https://svs.gsfc.nasa.gov/vis/a010000/a011800/a011825/OSIRIS-REx_Mission_Design_Transcript.html"
      },
      {
        "id": "flyby",
        "kind": "flyby",
        "label": "Earth flyby",
        "date": "22 Sep 2017",
        "title": "Aligning the journey",
        "description": "After about one year orbiting the Sun, OSIRIS-REx returns to Earth for a gravity assist that tilts its path toward Bennu's orbital plane.",
        "detail": "Earth-centered navigation vectors show approach, one close passage, and departure. Distances and model sizes share one physical scale. The position marker follows the route; spacecraft attitude is illustrative.",
        "source": "https://science.nasa.gov/mission/osiris-rex/in-depth/",
        "sourceLabel": "NASA · Mission overview"
      },
      {
        "id": "outbound",
        "kind": "outbound",
        "label": "Asteroid transfer",
        "date": "2017–2018",
        "title": "Onward to Bennu",
        "description": "After the Earth gravity assist, OSIRIS-REx continues toward Bennu on a changed heliocentric trajectory.",
        "detail": "The view returns to the Solar System scale. Continued cruise and navigation lead to the later rendezvous; this is an illustrative transfer.",
        "source": "https://science.nasa.gov/mission/osiris-rex/in-depth/",
        "sourceLabel": "NASA · Mission overview"
      },
      {
        "id": "rendezvous",
        "kind": "rendezvous",
        "label": "Rendezvous",
        "date": "3 Dec 2018",
        "title": "Mapping a rocky world",
        "description": "OSIRIS-REx arrives at Bennu and surveys its rugged surface to find a suitable sampling site.",
        "detail": "Arrival begins preliminary survey operations about 19 km from Bennu. The roughly 500 m asteroid is about 80 times wider than the 6.2 m spacecraft. Arrival is not the later orbit insertion.",
        "source": "https://science.nasa.gov/mission/osiris-rex/in-depth/",
        "sourceLabel": "NASA · Mission overview"
      },
      {
        "id": "tag",
        "kind": "sample",
        "label": "Touch and go",
        "date": "20 Oct 2020",
        "title": "Six seconds at Bennu",
        "description": "The TAGSAM head contacts Bennu. A burst of nitrogen drives loose material into the collector, then thrusters begin the back-away maneuver.",
        "detail": "The sampling head sinks into the loose surface before the spacecraft retreats.",
        "source": "https://svs.gsfc.nasa.gov/20360/",
        "sourceLabel": "NASA · TAG sequence"
      },
      {
        "id": "stowage",
        "kind": "stow",
        "label": "Sample stowage",
        "date": "28 Oct 2020",
        "title": "Securing the collection",
        "description": "The robotic arm places the collector head inside the return capsule. The head detaches from the arm, and the capsule closes.",
        "detail": "Stowage protects the collected material for the journey home.",
        "source": "https://www.nasa.gov/news-release/nasas-osiris-rex-successfully-stows-sample-of-asteroid-bennu/",
        "sourceLabel": "NASA · Sample stowage"
      },
      {
        "id": "departure",
        "kind": "depart",
        "label": "Departure",
        "date": "10 May 2021",
        "title": "Leaving Bennu",
        "description": "OSIRIS-REx begins its return journey with Bennu's rocks and dust secured aboard.",
        "detail": "At the departure maneuver, OSIRIS-REx was already about 359.5 km from Bennu. This mission prediction shows the changing range over six hours, rather than an oversized spacecraft sliding beside the surface.",
        "source": "https://science.nasa.gov/mission/osiris-rex/in-depth/",
        "sourceLabel": "NASA · Mission overview"
      },
      {
        "id": "capsule-release",
        "kind": "return",
        "label": "Capsule separation",
        "date": "24 Sep 2023",
        "title": "Releasing the return capsule",
        "description": "OSIRIS-REx releases the capsule toward Earth. About twenty minutes later, the spacecraft fires its engines to divert past the planet.",
        "detail": "The capsule is released about 102,000 km above Earth, roughly four hours before entry. It continues toward the atmosphere while the spacecraft diverts past Earth. The next chapter follows only the capsule through entry, parachute descent and landing.",
        "source": "https://science.nasa.gov/blogs/osiris-rex/2023/09/24/osiris-rex-spacecraft-departs-for-new-mission/",
        "sourceLabel": "NASA · Earth departure"
      },
      {
        "id": "recovery",
        "kind": "landing",
        "label": "Entry & landing",
        "date": "24 Sep 2023 · Utah",
        "title": "Bennu reaches Earth",
        "description": "The capsule crosses the atmosphere and lands under its main parachute at the Utah Test and Training Range. Teams recover the sample for laboratory study.",
        "detail": "The drogue deployed late and immediately detached; the main parachute completed the descent. Touchdown was at 08:52 MDT, or 14:52 UTC. The locator marks the recovery region.",
        "source": "https://science.nasa.gov/mission/osiris-rex/osiris-rex-faq/",
        "sourceLabel": "NASA · Sample return"
      }
    ],
    "sources": [
      {
        "label": "Solar cruise and Earth gravity assist",
        "href": "https://svs.gsfc.nasa.gov/vis/a010000/a011800/a011825/OSIRIS-REx_Mission_Design_Transcript.html"
      },
      {
        "label": "NASA mission chronology",
        "href": "https://science.nasa.gov/mission/osiris-rex/in-depth/"
      },
      {
        "label": "Atlas V nominal launch timeline and spacecraft dimensions (PDF)",
        "href": "https://www.nasa.gov/wp-content/uploads/2016/06/osiris-rex_press_kit_0.pdf#page=5"
      },
      {
        "label": "TAGSAM contact and retreat",
        "href": "https://svs.gsfc.nasa.gov/20360/"
      },
      {
        "label": "Collector head stowage",
        "href": "https://www.nasa.gov/news-release/nasas-osiris-rex-successfully-stows-sample-of-asteroid-bennu/"
      },
      {
        "label": "Spacecraft departure",
        "href": "https://science.nasa.gov/blogs/osiris-rex/2023/09/24/osiris-rex-spacecraft-departs-for-new-mission/"
      },
      {
        "label": "Utah sample return",
        "href": "https://science.nasa.gov/mission/osiris-rex/osiris-rex-faq/"
      },
      {
        "label": "Postflight parachute deployment investigation",
        "href": "https://science.nasa.gov/blogs/osiris-rex/2023/12/05/nasa-finds-likely-cause-of-osiris-rex-parachute-deployment-sequence/"
      },
      {
        "label": "Entry, descent and landing; triconic main parachute (PDF)",
        "href": "https://ntrs.nasa.gov/api/citations/20240014280/downloads/OREX_FM_SciTech2025_v2.pdf"
      }
    ]
  }
};
