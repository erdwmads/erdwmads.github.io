# Mission Log Consistency and Pointer Edges

Approved direction: keep the current visual language; format LOG 001-010 like LOG 011; restore gold-blue pointer-following edges; fix mobile flowchart interaction.

## Scope
- Preserve all existing experimental paragraphs, dates, parameters, captions, image links, and qualification language. Add descriptive section headings and group existing figures by their recorded purpose.
- Keep plaintext outside the repository and retain the existing encrypted archive and password workflow. Do not publish without a new deployment request.
- Reuse the existing edge-angle effect: two complementary colours, no rotating element or moving blur, no pointer animation on touch or reduced-motion devices.
- Diagnose both the Mission Index timeline and private Evidence Atlas on mobile. Keep horizontal gestures distinct from selection and preserve vertical page scrolling.

## Implementation
1. Record original private entry structure and image inventory; save a backup. Verify reformatting preserves all source prose, figure captions, attributes, and metadata.
2. Add browser regression coverage for gold-blue edges and mobile flowchart gestures. Run it before changes to establish failures.
3. Update the existing CSS/JS and remove the hard-coded initial log. Add keyboard-accessible timeline controls only if they materially improve access.
4. Format the private entry bodies with semantic headings and grouped figures, re-encrypt locally, and verify old scientific text against the backup.
5. Run existing log tests, browser checks on desktop/mobile and both themes, build and site validation. Inspect screenshots and provide the local preview.

## Acceptance
- LOG 001-010 have readable section hierarchy; no original prose, captions or images lost. LOG 011 unchanged.
- Blue and gold edge highlights track a desktop mouse and clear on pointer exit, scroll, navigation and disabled FX. No element size changes.
- Mobile timelines and atlas nodes remain inside the viewport, can be swiped to both ends, and do not select entries while dragging.
- Original password unlocks the local archive; relocking purges private UI.
