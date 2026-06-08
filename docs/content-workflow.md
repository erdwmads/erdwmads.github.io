# Content Workflow

This site should treat structured research entries as the primary source of truth. Pages should be derived from entries, not hand-maintained as separate copies of the same status.

## Primary Rule

One research memo should become one or more structured Mission Log entries. Each entry can fan out to:

- Mission Log body
- Mission Index
- top status cards
- Research Log project summary
- homepage Current Focus snippets
- figure captions and alt text
- tags and next-step notes

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

## Fan-Out Mapping

- `logNumber` and `date` generate Mission Index cards.
- `logNumber`, `sol`, `date`, `title`, `bodyParagraphs`, `figures`, and `tags` generate Mission Log cards.
- `latestNote` and `date` generate Latest update.
- `stage` and `stageNote` generate Current stage.
- `questionShort` and `questionNote` generate Current question.
- `nextStep` and `nextNote` generate Next step.

## Project-Level Constants

Keep `questionShort` stable at the project level unless the project scope changes. The longer `questionNote` can change with the latest entry.

Recommended project fields:

```json
{
  "id": "orgueil-ci1-dolomite",
  "questionShort": "Dolomite in Orgueil CI1",
  "targetMaterial": "Orgueil CI1 chondrite",
  "methods": ["SEM/EPMA", "single-grain XRD", "TEM"],
  "statusMode": "Research"
}
```

## Image Data

Keep the current three-layer image model:

```json
{
  "thumbSrc": "https://images.weserv.nl/?url=erdwmads.github.io%2Fassets%2Fimg%2FIMAGE.jpg&w=720&output=webp&q=70",
  "fullSrc": "assets/img/IMAGE.jpg",
  "mobileFullSrc": "https://images.weserv.nl/?url=erdwmads.github.io%2Fassets%2Fimg%2FIMAGE.jpg&w=1280&output=webp&q=78",
  "alt": "Visual description for accessibility",
  "caption": "Fig. 1 - Archive caption."
}
```

Desktop can use the lightbox. Mobile Mission Log images should remain inline figures with visible captions.
