# Website Maintenance Templates

Use these templates when asking Codex to update `erdwmads.github.io`. They keep routine edits scoped and reduce accidental changes to unrelated pages.

## Add a Paper

Target file: `paper-shelf.html`

Insert a new card inside:

```html
<section class="section paper-shelf">
```

Template:

```html
<article class="paper-card">
  <div class="paper-status">SHORT CATEGORY</div>
  <h2>PAPER TITLE</h2>
  <p class="muted">AUTHOR ET AL. (YEAR)</p>
  <p>ONE-SENTENCE RELEVANCE TO MY RESEARCH.</p>
  <div class="project-tags"><span>TAG 1</span><span>TAG 2</span><span>TAG 3</span></div>
</article>
```

Prompt to use:

```text
Add this paper to paper-shelf.html. Put it near related papers, keep the existing paper-card style, and do not change unrelated cards.

Category:
Title:
Authors/year:
Relevance:
Tags:
Optional link:
```

Checks:

- `paper-shelf.html` still has balanced `<article>` tags.
- Tags stay short enough for mobile.
- If a link is added, verify the URL and use descriptive link text.

## Add a Graduation Research Log Entry

Target file: `research-graduation.html`

Add the newest entry near the top of:

```html
<div class="research-note-list mission-log-list" data-mission-log-list>
```

Also update:

- the status cards near the top of `research-graduation.html`
- the Mission Index quick-jump list
- `research-log.html` project progress fields if the new entry becomes the latest public update

Template:

```html
<article id="log-007" class="research-note-card mission-log-entry"
      data-log-date="YYYY/MM/DD"
      data-log-stage="CURRENT STAGE"
      data-log-question="CURRENT QUESTION"
      data-log-next-step="NEXT STEP"
      data-log-latest-note="ONE-SENTENCE LATEST NOTE."
      data-log-stage-note="ONE-SENTENCE STAGE NOTE."
      data-log-question-note="ONE-SENTENCE QUESTION NOTE."
      data-log-next-note="ONE-SENTENCE NEXT-STEP NOTE.">
  <div class="research-note-date">LOG 007</div>
  <div class="research-note-body">
    <p class="mission-entry-kicker">SOL XXX / YYYY-MM-DD</p>
    <h3>Mission Log 007 - SHORT TITLE</h3>
    <p>FIRST PARAGRAPH.</p>
    <p>SECOND PARAGRAPH.</p>
    <div class="mission-photo-grid single-photo">
      <figure>
        <img src="https://images.weserv.nl/?url=erdwmads.github.io%2Fassets%2Fimg%2FIMAGE_FILE.jpg&w=720&output=webp&q=70"
             data-full-src="assets/img/IMAGE_FILE.jpg"
             data-mobile-full-src="https://images.weserv.nl/?url=erdwmads.github.io%2Fassets%2Fimg%2FIMAGE_FILE.jpg&w=1280&output=webp&q=78"
             alt="DESCRIPTIVE ALT TEXT"
             loading="lazy"
             decoding="async"
             fetchpriority="low">
        <figcaption>Fig. 1 - CAPTION.</figcaption>
      </figure>
    </div>
  </div>
</article>
```

Prompt to use:

```text
Add a new graduation research Mission Log entry. Keep the current latest-first layout, update status cards and the Mission Index, and verify all referenced images exist.

Date:
Log number:
SOL:
Title:
Stage:
Question:
Next step:
Main notes:
Images and captions:
```

Checks:

- `id="log-XXX"` is unique.
- Mission Index links to the new `#log-XXX`.
- `data-log-*` fields match the status cards.
- New images are stored in `assets/img/` and referenced with exact case-sensitive names.

## Replace Images

Target files:

- homepage portrait: `assets/img/profile.jpg`
- CV image: `assets/img/CV.jpg`
- photography gallery: `photography.html` plus `assets/img/photo (N).jpg`
- mission log images: `research-graduation.html` plus `assets/img/grad-log-YYYYMMDD-NN.jpg`

Prompt to use:

```text
Replace the website image below. Preserve existing layout dimensions and update all references if the filename changes.

Image role:
Old filename:
New filename:
Alt text:
Caption, if any:
```

Checks:

- Prefer replacing an existing file with the same name when the page structure should not change.
- If using a new filename, update every `src`, `data-full-src`, thumbnail, and marquee reference.
- Keep large web images compressed; avoid multi-megabyte images unless detail inspection requires them.
- Run the local resource check before committing.

## Local Resource Check

Run this from the repository root after changing HTML paths:

```powershell
$missing = @()
Get-ChildItem -Filter *.html | ForEach-Object {
  $file = $_.Name
  $content = Get-Content -Raw -LiteralPath $_.FullName
  [regex]::Matches($content, '(?:href|src|data-full-src|data-mobile-full-src)="([^"]+)"') | ForEach-Object {
    $raw = $_.Groups[1].Value
    if ($raw -match '^(https?:|mailto:|tel:|#|javascript:)' -or $raw -eq '') { return }
    $pathPart = ($raw -split '#')[0]
    $pathPart = ($pathPart -split '\?')[0]
    try { $decoded = [uri]::UnescapeDataString($pathPart) } catch { $decoded = $pathPart }
    if ($decoded -eq '' -or $decoded -match '^https?:') { return }
    $target = Join-Path (Get-Location) $decoded
    if (-not (Test-Path -LiteralPath $target)) {
      $missing += [pscustomobject]@{ File = $file; Ref = $raw; Decoded = $decoded }
    }
  }
}
$missing | Format-Table -AutoSize
```
