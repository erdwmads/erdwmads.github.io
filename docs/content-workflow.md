# Content Workflow

Structured Mission Log entries are the source of truth for the protected archive. Public pages are not derived from entries: their project facts come from one data file, `src/data/project.mjs` (see Project Facts below).

The user can send rough notes, images, paper citations, or meeting summaries. Codex is responsible for turning that material into structured entries and editing the website files.

## Primary Rule

One research memo should become one or more structured Mission Log entries. After unlock, each entry fans out only inside the Graduation Research page:

- Mission Log card (body, figures, captions and alt text)
- Mission Index card
- the entry's Recorded / Still open / Next step summary
- the Evidence Atlas opened from that entry

The user does not need to provide all fields below. Missing fields should be inferred conservatively from the supplied material, or Codex should ask a focused follow-up question if the entry would otherwise be scientifically misleading.

## Entry Split Rule

Use one entry for one coherent process cluster:

- same operation phase
- same date or tightly linked dates
- one result or problem thread
- one next-step decision
- one related image set

Split into multiple entries when the process phase changes. For example, cutting and EPMA mapping should usually be separate entries if both have distinct observations and next steps.

## Core Entry Fields

```json
{
  "logNumber": 7,
  "sol": 60,
  "date": "2026-06-09",
  "slug": "short-entry-slug",
  "title": "Short process-based title",
  "latestNote": "One sentence describing the latest completed update.",
  "stage": "Current stage as a short noun phrase",
  "stageNote": "One sentence explaining the stage.",
  "questionShort": "Dolomite in Orgueil CI1",
  "questionNote": "The current scientific or technical question.",
  "nextStep": "Short next action",
  "nextNote": "One sentence with schedule, instrument, collaborator, or constraint.",
  "bodyParagraphs": [],
  "tags": [],
  "figures": []
}
```

This example is illustrative. The current private JSON is authoritative; the publisher (`scripts/publish-protected-mission-log.mjs`) requires a unique `id`, a positive `number`, `label`, `bodyHtml`, and `isoDate` or `date`.

The private implementation source is `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json`. The page shell is rendered by `src/components/MissionLogShell.astro`, and entries are loaded from the encrypted archive only after the Graduation Research password gate.
The public Research Log page may show a project summary; the detailed Mission Log should load only on the password-gated Graduation Research page.

## Protected Mission Log Maintenance

1. Edit the private source at `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json`.
2. Back up new original images to `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\事前準備` and publish display derivatives only (see the image rule below).
3. The owner runs `powershell -NoProfile -File scripts\publish-mission-log.ps1 -CheckLeaks` and types the passphrase at its hidden prompt. The script hands the passphrase only to the node publisher (`npm run publish:mission-log`); it never goes into a file, argument, log, session variable or prompt. A passphrase that does not decrypt the current archive aborts with nothing written, unless `-RotatePassphrase` is passed to change it on purpose (passkey-linked browsers must then be linked again). It also refuses, with nothing written, an entry whose `bodyHtml` has an off-site image or media, an inline event handler or a `javascript:` URL, which the site's Content Security Policy would block. `-CheckLeaks` scans `src/`, `public/` and `dist/` for entry text and reports only paths and entry ids.
4. Run `npm run check:all`: every unit test (the protected Mission Log tests included), then build, `export:ppt-data` and `check:site`.
5. Commit the encrypted payload and public image derivatives, never the private JSON or passphrase.
6. Delete temporary drafts, review notes and scratch files that hold entry text.

## Fan-Out Mapping

- `id`, `number`, `sol`, `label`, `date` (or `isoDate`) and `stage` generate the Mission Index card.
- `label`, `date` and `bodyHtml` (figures, captions and alt text included) generate the Mission Log card.
- `latestNote`, `questionNote` and `nextNote` (falling back to `stageNote` or `stage`, `question` and `nextStep`) generate Recorded / Still open / Next step.
- `stage`, `question`, `questionNote`, `latestNote` and `nextStep` feed the Evidence Atlas opened from that entry.

## Project-Level Constants

Keep `questionShort` stable at the project level unless the project scope changes. The longer `questionNote` can change with the latest entry.

### Project Facts

`src/data/project.mjs` holds the project facts: `questionShort`, the canonical question, the display and formal titles, period, laboratories and advisers, target material and phase, the three sub-questions, the methods summary (derived from the pathway statuses), the Orgueil vs returned samples comparison and the seven Analytical Pathway steps, each with its purpose, what it can answer, what it cannot establish and a status. Edit the fact there; it fans out to:

- `src/components/CurrentFocus.astro`: home Current Focus
- `src/pages/research.astro` with `src/components/AnalyticalPathway.astro` (full variant): research question, sub-questions, Analytical Pathway and comparison card
- `src/pages/research-log.astro`: the Research Log front door (title, facts, compact pathway)
- `src/pages/research-graduation.astro`: protected project context and compact pathway
- `src/components/EvidenceAtlasData.astro`: the public research atlas data read by `public/assets/js/mineral-interactions.js`
- `scripts/export-ppt-data.mjs`: the formal title in `dist/ppt-data.json`

Pathway statuses (`In progress`, `Next`, `Planned`, `Interpretation`, dated by `statusAsOf`) are set by the owner; all seven were owner-confirmed for October 2026. Never mark a step `Completed` without the owner's confirmation: `scripts/project-facts.test.mjs` and `check:site` fail on any other status, and the test pins each step's status, so a change is a deliberate edit to both `project.mjs` and the test.

Still hand-written: the Research experience entry in `src/legacy/cv-main.html`, page meta descriptions in `src/pages/*.astro`, the Interface 2046 HUD labels in `public/assets/js/research-coordinates.js` and the field-guide focus sentence in `src/scripts/planetary-explorer.js`.

## Image Data

Mission Log figures live inside `bodyHtml`, with local paths:

```html
<figure>
  <img class="mission-thumb-img" src="assets/img/mission-log/grad-log-YYYYMMDD-NN.jpg" data-full-src="assets/img/mission-log/grad-log-YYYYMMDD-NN.jpg" alt="Visual description for accessibility">
  <figcaption>Fig. 1 - Archive caption.</figcaption>
</figure>
```

The publisher points `src` at the 720w WebP thumbnail in `assets/img/thumbs/mission-log/` (generate it with `npm run images:derive -- mission-log`); the desktop viewer opens `data-full-src`.

Image rule: new Mission Log images publish display derivatives under `public/assets/img/mission-log/`, at most 2400 px on the long edge and 1.5 MB, with metadata (EXIF/XMP) stripped. Back up the instrument original first to `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\事前準備` as `orgueil-mission-log-YYYYMMDD-figNN.jpg`. Replace an existing public image only with the owner's approval. `npm run audit:images` (and `check:site` in CI) fails on any Mission Log image over these limits; all 90 met them on 2026-10-24.

Desktop can use the lightbox. Mobile Mission Log images should remain inline figures with visible captions (see `docs/ui-invariants.md`).

### Mission Log images are not protected

The passphrase and passkey flow encrypts entry text only. Every file under `public/assets/img/mission-log/` and `public/assets/img/thumbs/mission-log/` is deployed as an ordinary static asset: anyone with the URL can fetch it, and the filenames can be listed from the public GitHub repository. The owner accepted this boundary on 2026-09-21.

Treat adding an image to that folder as publishing it:

- Add only images the owner is willing to expose before the work is published. Hold back figures that would reveal an unpublished result on their own.
- Publish a display derivative under the image rule above, never the instrument original.
- Do not put sample IDs, coordinates, or conclusions in image filenames. Keep the neutral `grad-log-YYYYMMDD-NN.jpg` pattern.
- Captions and alt text stay in the encrypted payload, so an exposed image carries no interpretation with it.

Removing an image later does not remove it from git history.
