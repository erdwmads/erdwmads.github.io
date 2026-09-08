# Lighting, Arrival, and Mission Progress

Approved scope: proposals 1, 3, and 4. Preserve fonts, geometry, original archive content, encrypted storage, and existing motion safeguards. Deploy after verification.

- [x] Establish lighting hierarchy without hover movement; retain gold/blue pointer borders on actions.
- [x] Give the existing entrance a continuous slow-fast-slow camera clock and question-first typography, without extending playback.
- [x] Render Recorded / Still open / Next step from decrypted entry metadata; add date comparison with uncropped representative images.
- [x] Verify unit tests, desktop/mobile browser behavior, reduced motion, archive locking, screenshots, and build integrity.

Verification: 36 unit tests; arrival integration and lifecycle; action materials at 1440/390/320 in both themes; Research and CV geometry; touch timeline; all 11 private records at 1440/390/320 with the source unchanged; nine-page build and site check. Local Edge measured 6917ms desktop / 4808ms mobile-emulated playback and an 8.5ms maximum galaxy/Sun handoff frame gap. These are local measurements, not guarantees for every device.

Release gate: commit only scoped files, push the validated source to the existing GitHub Pages workflow, then verify workflow success and the production assets.
