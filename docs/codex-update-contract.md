# Codex Update Contract

The user supplies research content, notes, papers, images, or presentation goals. Codex performs the website edits.

## Source Of Truth

- Site chrome, navigation, page scripts: `src/data/site.ts`
- Paper Shelf: `src/data/papers.ts`
- Mission Log: `src/data/missionLog.ts`
- Mission Log layout: `src/components/MissionLog.astro`
- Paper Shelf layout and filters: `src/components/PaperShelf.astro`
- Visual system and effects: `public/assets/css/style.css` and `public/assets/js/`

## Mission Log Rule

When the user sends raw notes, Codex should:

1. Decide whether the notes are one entry or multiple entries.
2. Write clear public-facing English.
3. Preserve scientific details and uncertainty.
4. Add or update `src/data/missionLog.ts`.
5. Verify images and generated pages.
6. Run `npm run check`.

The user should not be asked to produce HTML or TypeScript unless they explicitly want to.

## Paper Shelf Rule

When the user sends a paper, Codex should:

1. Normalize author/year, title, relevance, category, and tags.
2. Add it to `src/data/papers.ts`.
3. Add reader-facing `tags` and button-matching `filters`.
4. Use existing filter IDs unless a genuinely new shelf category is needed: `dolomite`, `ci-orgueil`, `ryugu-bennu`, `methods`, `chronology`.
5. Run `npm run check`.

## PPT Rule

When the user asks for slides, Codex should:

1. Run `npm run check` or at least `npm run export:ppt-data`.
2. Use `dist/ppt-data.json` as a structured source.
3. Build the deck from current Mission Log and Paper Shelf content.
4. Keep claims traceable to the provided notes, papers, or website data.

## Safety Rule

Before pushing to `main`, Codex should:

1. Run `npm run check`.
2. Confirm `git status --short --branch`.
3. Commit with a clear message.
4. Push `main`.
5. Keep the previous main commit available for rollback.
