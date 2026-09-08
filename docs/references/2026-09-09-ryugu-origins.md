# Origins: Ryugu source review

Reviewed 2026-09-09. Scope: English copy and scientific guidance, not a reconstruction of Orgueil's parent asteroid.

## Source and inspection

T. Nakamura et al. (2023), "Formation and evolution of carbonaceous asteroid Ryugu: Direct evidence from returned samples," *Science* 379, eabn8671. [Primary DOI](https://doi.org/10.1126/science.abn8671). First published online 22 September 2022; issue date 24 February 2023. The title, author and DOI match the [JAXA research-team announcement](https://global.jaxa.jp/press/2022/09/20220923-1_e.html). Publisher retrieval failed in this review; the full paper was read locally, not inferred from the announcement.

Local source: the user-provided copy, `Formation and evolution of carbonaceous asteroid.pdf`.

The 15-page file contains a one-page research summary followed by article pages 1-14. Below, "PDF page" means the one-based file page; "article page" means the printed page. Text was extracted with pypdf. PDF pages 1 and 11 were rendered with Poppler and visually inspected, including the six-step summary evolution diagram and Fig. 7A-F. Supplementary figures and movies were not inspected.

## Defensible sequence

1. Rocky grains, organics and water/CO2 ice assemble into an early parent body. CO2-bearing fluid inclusions support an origin beyond the relevant snow lines for Ryugu's parent; they do not locate Orgueil's parent. Evidence: Fig. 5, PDF page 9 / article page 8; formation discussion, PDF page 12 / article page 11.
2. Low-relative-speed aggregate collisions can stick, but collisions can also bounce or fragment. Do not equate all encounters with growth, or treat grain sticking as a complete planetesimal-formation mechanism. Nakamura's thermal calculation assumes instantaneous parent-body accretion; it does not simulate this assembly. Supplementary collision sources are listed below.
3. Interior heating from aluminium-26 decay melts accreted water ice. Liquid water then reacts with the rock; hydration releases additional heat in the model. The colder outer layer has less melting and less alteration. Evidence: summary diagram steps 1-3, PDF page 1; Fig. 7E, PDF page 11 / article page 10; thermal-model discussion, PDF page 12 / article page 11.
4. Water-rock reactions form hydrous silicates and precipitate carbonates. Hydration and carbonate growth can overlap; the three interface moments are explanatory divisions, not three non-overlapping geological episodes. The paper's chemistry models are equilibrium calculations, not a measured reaction movie or fluid-flow reconstruction. Evidence: Fig. 7A-D and chemical-model discussion, PDF pages 11-12 / article pages 10-11.
5. Much later, a destructive impact ejects fragments. Strong shock heating is localized; relatively cool material can preserve the earlier alteration record and reaccumulate into Ryugu. Evidence: summary diagram steps 4-6; Fig. 7F and impact discussion, PDF pages 11-13 / article pages 10-12.

## Numbers and their limits

All early times below are measured after CAI formation, the adopted Solar System time zero, not after parent-body assembly.

| Quantity | Supported value and interpretation | Location |
| --- | --- | --- |
| Parent formation | 1.8-2.9 Myr, dependent on initial water/rock mass ratio 0.9-0.2; instantaneous accretion assumed | PDF 12 / article 11 |
| Overview chronology | Formation about 2 Myr; ice melting about 3 Myr; extensive alteration about 5 Myr. These are rounded model milestones, not independently measured event dates | PDF 1, summary diagram |
| Thermal example | Radius 65 km, formation 2.23 Myr, water/rock 0.6; assumed initial temperature -200 C, ice melting at 0 C and hydration at 20 C | Fig. 7E, PDF 11; PDF 12 |
| Mineral temperatures | Pentlandite estimate 20 +/- 29.5 C; dolomite oxygen-isotope estimate 37 +/- 10 C. The latter is cited from Yokoyama et al., the paper's reference 29 | PDF 10 / article 9 |
| Carbonate timing | 5.2 Myr reported from reference 29; the illustrated thermal model forms hydrous/carbonate minerals around 4.8 Myr and subsequently reaches about 75 C | PDF 12 / article 11 |
| Outer layer | In that model, the outer 14 km has limited melting and little alteration. This is not a measured shell thickness or an Orgueil parameter | PDF 12 / article 11 |
| Disruption | About 1 billion years ago in the summary, not 1 billion years after CAIs | PDF 1, conclusion |
| Impact example | 6-km-radius impactor, 50-km-radius parent, 5 km/s; near-impact temperatures above 700 C, remote regions below 90 C | PDF 12-13 / article 11-12 |

Do not turn 0-40 C chemical-model runs, a mineral formation temperature, or the approximately 75 C example peak into one universal temperature. Fig. 7A-D varies water/rock ratio, not time; its curves are not a temporal precipitation sequence. The summary's roughly 1:10 impactor size comparison refers physically to the earlier parent, not today's sub-kilometre Ryugu; use the explicit main-text radii. No numerical ages, temperatures, sizes or impact speeds are assigned to Orgueil in the revised interface.

## Comparison sources

- **Orgueil/CI carbonates:** M. Endress and A. Bischoff (1996), "Carbonates in CI chondrites: clues to parent body evolution," *Geochimica et Cosmochimica Acta* 60, 489-507. [DOI](https://doi.org/10.1016/0016-7037(95)00399-1); [indexed primary abstract](https://pubmed.ncbi.nlm.nih.gov/11539921/). Supports variable fluid conditions and multiple alteration episodes, not a Ryugu-Orgueil parent identification. This is also Nakamura reference 48. Abstract/metadata checked; full article not reviewed here.
- **Aggregate collisions:** C. Guettler et al. (2010), "The outcome of protoplanetary dust growth: pebbles, boulders, or planetesimals? I. Mapping the zoo of laboratory collision experiments." [DOI](https://doi.org/10.1051/0004-6361/200912852); [author manuscript abstract](https://arxiv.org/abs/0910.4251). Laboratory-informed models distinguish sticking, bouncing and fragmentation by mass, porosity and relative speed. R. Weidling et al. provide an additional [microgravity collision experiment](https://arxiv.org/abs/1105.3909), [published DOI](https://doi.org/10.1016/j.icarus.2012.01.012). These abstracts and DOI metadata were checked, not their full papers. Do not transfer experimental speed thresholds to an illustrated asteroid or to arbitrary ice/dust mixtures.
- **Bennu:** T. J. Zega et al. (2025), "Mineralogical evidence for hydrothermal alteration of Bennu samples," *Nature Geoscience* 18, 832-839. [DOI](https://doi.org/10.1038/s41561-025-01741-0). Publisher-indexed metadata and mineralogical summary checked; full article access was blocked. Used only for the broad returned-sample statement about hydrous silicates and carbonates, not for a shared chronology or parent identity.

## Rendering handoff

- Preserve `originAlterationSteps` at three entries with progress 0.52, 0.61 and 0.72; stage/index thresholds and all exported APIs are unchanged. The moments now mean ice melting, water-rock reaction and mineral record.
- For accretion, show slow relative approach and contact before adhesion, with some bouncing/fragmentation. Larger-body accumulation is a separate scale transition, not proof of uninterrupted growth by sticking. Use the collision sources above; no invented universal sticking speed.
- At 0.52, show ice in the rock losing volume as liquid appears in the same local pore space. Retain a colder, less-altered outer region. At 0.61, show liquid contacting solid mineral surfaces and gradual alteration; at 0.72, retain the altered matrix with carbonate growth. These are conceptual visual translations of Fig. 7E, not simulated flow rates.
- Keep the rock framework solid, with no magma ocean or glowing molten interior. Make any temperature/alteration colors nonliteral. Fig. 7's colors are quantitative overlays, not the natural color of rock, water or heat emission.
- Separate the late impact from early accretion. Show contact, ejecta dust and irregular fragments, localized heating if needed, then partial reaccumulation. Do not depict persistent combustion fireballs or globally incandescent debris: Fig. 7F and PDF pages 12-13 support localized heating and preservation of cooler material.
- Do not make the Orgueil fragment transform into Ryugu or Bennu, or imply that their present shapes reproduce an original parent body. Keep crystal sizes, fluid paths, timing and the Orgueil parent geometry explicitly conceptual.
