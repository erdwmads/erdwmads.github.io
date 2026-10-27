# Content Workflow

Structured Mission Log entries are the source of truth for the protected archive. Public pages are not derived from entries: their project facts are hand-written copies (see Project Facts below), so a change of project status must be made in every copy.

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

This example is illustrative. The current private JSON is authoritative; the publisher requires `id`, `number`, `label`, `bodyHtml`, and `isoDate` or `date`.

The private implementation source is `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json`. The page shell is rendered by `src/components/MissionLogShell.astro`, and entries are loaded from the encrypted archive only after the Graduation Research password gate.
The public Research Log page may show a project summary; the detailed Mission Log should load only on the password-gated Graduation Research page.

## Protected Mission Log Maintenance

1. Edit the private source at `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json`.
2. Back up new original images to `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\事前準備` and publish display derivatives only (see the image rule below).
3. The owner runs `powershell -NoProfile -File scripts\publish-mission-log.ps1 -CheckLeaks` and types the passphrase at its hidden prompt. The script hands the passphrase only to the node publisher (`npm run publish:mission-log`); it never goes into a file, argument, log, session variable or prompt. A passphrase that does not decrypt the current archive aborts with nothing written, unless `-RotatePassphrase` is passed to change it on purpose (passkey-linked browsers must then be linked again). `-CheckLeaks` scans `src/`, `public/` and `dist/` for entry text and reports only paths and entry ids.
4. Run the protected tests, build, `export:ppt-data`, and `check:site`.
5. Commit the encrypted payload and public image derivatives, never the private JSON or passphrase.
6. Delete temporary drafts, review notes and scratch files that hold entry text.

## Fan-Out Mapping

- `id`, `number`, `sol`, `label` and `date` (or `isoDate`) generate the Mission Index card.
- `label`, `date` and `bodyHtml` (figures, captions and alt text included) generate the Mission Log card.
- `latestNote`, `questionNote` and `nextNote` (falling back to `stageNote` or `stage`, `question` and `nextStep`) generate Recorded / Still open / Next step.
- `stage`, `question`, `questionNote`, `latestNote` and `nextStep` feed the Evidence Atlas opened from that entry.

## Project-Level Constants

Keep `questionShort` stable at the project level unless the project scope changes. The longer `questionNote` can change with the latest entry.

### Project Facts

There is no project data file. The title, research question, target material, methods and Analytical Pathway are hand-written copies; update every copy that carries the changed fact:

- `src/legacy/index-main.html`: home Current Focus (summary, full title, current question, target material, methods, broader context)
- `src/legacy/research-main.html` and `src/legacy/research-methods.html`: Research page question, research record and Analytical Pathway
- `src/legacy/research-log-main.html`: Research Log project summary (title, full title, question, methods)
- `src/legacy/research-graduation-hero.html`, `research-graduation-project-info.html` and `research-graduation-after-log.html`: archive lead and method pills, project context, and the graduation copy of the Analytical Pathway
- `src/legacy/cv-main.html`: Research experience entry
- `src/components/EvidenceAtlasData.astro`: public Evidence Atlas question, material and methods
- page meta descriptions in `src/pages/*.astro`; the Interface 2046 HUD labels in `public/assets/js/research-coordinates.js`; the atlas text in `public/assets/js/mineral-interactions.js` and the field-guide focus sentence in `src/scripts/planetary-explorer.js`

## Image Data

Keep Mission Log image paths local:

```json
{
  "thumbSrc": "assets/img/IMAGE.jpg",
  "fullSrc": "assets/img/IMAGE.jpg",
  "mobileFullSrc": "assets/img/IMAGE.jpg",
  "alt": "Visual description for accessibility",
  "caption": "Fig. 1 - Archive caption."
}
```

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
