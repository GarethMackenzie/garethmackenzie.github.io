# Sovereign two-volume validation

Validated locally on 11 November 2026 with headless Chrome and software WebGL.

- Source audit: 20 HTML documents passed.
- Links and assets: 18 sitemap URLs passed; staged artifact verified 771 local references.
- Responsive interaction checks: 320, 390, 768, 1024, 1440 and 1920 pixels.
- Short screens: 320 × 568 and 390 × 667, including copy/ledger separation.
- Both editions: foreground depth ordering, two-way scroll and ledger selection.
- Reader: all six pages, previous/next, touch swipe, focus trap, close and focus restoration.
- Reduced motion, unavailable WebGL, missing Worker and WebGL context loss passed.
- Missing cover requests: procedural artwork rendered and the reader remained usable.
- Theme persistence and axe-core accessibility checks passed in both themes.
- Router: one canvas/renderer retained across all route families; history, race handling,
  keyboard focus and robots metadata passed.
- Twelve reader captures passed the opaque-compositing regression check.

The initial short-screen test had an ambiguous selector after adding the introduction
link; the selector was corrected and the group passed. A verbose local HTTP server
subsequently stalled on its output buffer; the affected groups passed against a quiet
server. Browser interactions and assertions were retained during those reruns.

Existing cover-image regeneration, SEO normalization and hardening ran locally.
Social-card regeneration remains a CI check: the local Python runtime lacks fontTools
and the Linux font paths used by the existing scripts. Existing social-card assets
were preserved. This validation does not substitute for physical iOS/Android or
hardware-GPU testing.

BUILT intentionally retains its approved overview and companion essays, as selected
by the author. No unsupplied manuscript excerpt or epigraph was invented.
