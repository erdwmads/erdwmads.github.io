# Codex Update Contract

The user supplies research content, notes, papers, images, or presentation goals. Codex performs the website edits.

## Source Of Truth

- Site chrome, navigation, page scripts: `src/data/site.ts`
- Paper Shelf: `src/data/papers.ts`
- Password-gated Mission Log: `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json`
- Mission Log shell and lazy loading: `src/components/MissionLogShell.astro`
- Mission Log images: `public/assets/img/mission-log/`
- Paper Shelf layout and filters: `src/components/PaperShelf.astro`
- Visual system and effects: `public/assets/css/style.css` and `public/assets/js/`

## Mission Log Rule

When the user sends raw notes, Codex should:

1. Decide whether the notes are one entry or multiple entries.
2. Write clear public-facing English.
3. Preserve scientific details and uncertainty.
4. Add or update the private Mission Log JSON outside the repository.
5. Back up original photos to `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\事前準備`, then update the public display copies under `public/assets/img/mission-log/`.
6. Publish `public/assets/data/mission-log.enc.json` with the passphrase held only in process memory or a one-time local handoff.
7. Run the protected tests, build, PPT export, and site check before committing website changes.
8. Commit only the encrypted payload and public image derivatives, never the private JSON or passphrase.

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

1. Run the protected tests, site build, and `npm run export:ppt-data`.
2. Use `dist/ppt-data.json` for public Paper Shelf and project metadata only.
3. When slides need Mission Log content, read it locally from the private Mission Log JSON; never add it back to the public PPT export.
4. Build the deck from the current private Mission Log and public Paper Shelf content.
5. Keep claims traceable to the provided notes, papers, or website data.

## Safety Rule

Before pushing to `main`, Codex should:

1. Run `npm run check`.
2. Confirm `git status --short --branch`.
3. Commit with a clear message.
4. Push `main`.
5. Keep the previous main commit available for rollback.
