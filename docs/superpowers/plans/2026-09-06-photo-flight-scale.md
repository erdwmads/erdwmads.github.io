# Photo Flight and Research Scale Journey

**Approved scope:** Implement recommendation 5 (photo expands from its tile) then 2 (research scale journey). Preserve existing visual language and the corrected fullscreen target.

**Architecture:** A transient image overlay inside the presentation surface animates between the tile and contained viewer image. Never transform the dialog or fullscreen ancestor. Cancel/clean it on image changes, fullscreen, resize, navigation, relock and reduced-motion changes. FX OFF and reduced motion use immediate transitions. Closing returns only to the matching visible tile; otherwise close directly. Scale journey is a separate Astro section with semantic tabs, source-backed public imagery and no protected archive content.

- [x] Add photo-flight regression tests, including cancellation and reduced motion.
- [x] Implement transient image transition without changing the fullscreen lifecycle.
- [x] Implement and integrate a source-backed public scale journey.
- [x] Verify screenshots, keyboard, desktop/mobile, both themes, FX gating and existing viewer regressions.
- [x] Build and check resources. No commit or deployment.
