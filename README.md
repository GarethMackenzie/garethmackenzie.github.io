# Gareth Andrew Mackenzie

Author website for Gareth Andrew Mackenzie. The author is the brand; *BUILT:
How Wealth Is Deliberately Constructed* and *When Advantage Expires* are his two books.

Live site: https://mackenziebooks.bbroot.com/ (custom domain; GitHub Pages)

## Domain

- The `CNAME` file in the repo root holds the custom domain (`mackenziebooks.bbroot.com`). Do not delete it: removing it unpublishes the custom domain.
- DNS (at the registrar/DNS host): a `CNAME` record for `mackenziebooks` pointing to `garethmackenzie.github.io`.
- GitHub: Settings > Pages > Custom domain, then tick "Enforce HTTPS" once the certificate is issued.
- With the custom domain set, `garethmackenzie.github.io` redirects to it.
- Canonical URLs, Open Graph URLs, JSON-LD, `sitemap.xml` and `robots.txt` use `https://mackenziebooks.bbroot.com/`. The scripts in `tools/` still hardcode the old `garethmackenzie.github.io` address; update them before re-running any of them.
- Editing this README does not change the site; pages are built from the HTML files.

## Structure

```
/                 Homepage
/about/           Author bio
/books/           Books index (BUILT and When Advantage Expires)
/built/           BUILT book page
/insights/        Writing index
/insights/<slug>/ Individual essays (10)
/media/           Press kit: bio, cover, portrait, interview topics
/contact/         Contact form + enquiry routing
/privacy/ /terms/ Legal
```

Navigation order/labels are the same on every page: About, Writing, Books, Media, Contact.
There is no BUILT button in the global navigation: BUILT is the current flagship inside Books, so the structure still works when later titles arrive.

## Stylesheets

All routes load the shared foundation and view styles in the same order:
`dist/site.css`, `dist/pages.css`, `dist/author-home.css`,
`insight-article.css`, and `dist/editorial-views.css`. This keeps direct entry
and client-side navigation consistent. These are authored files with no CSS build
step. Newsreader and Instrument Sans remain self-hosted under `assets/fonts/`.

## Validation

```
python3 tools/validate_site.py
```

Checks heading structure, internal links, image alt text, and sitemap
coverage. Note: as of this commit it reports one known false positive
("sitemap.xml: expected six GitHub Pages URLs") — a hardcoded check from
before the site had a Books page and ten essays; the sitemap itself is
correct.

## Release documents

- `docs/deployment.md`: switching GitHub Pages to GitHub Actions, pre-flight evidence, procedure and rollback.
- `docs/contact-form.md`: replacing the visible recipient address with FormSubmit's random alias (owner action required).
- `docs/manual-testing.md`: real-device and screen-reader checklist.
- `tools/verify_artifact.py`: verifies the staged production artifact (also run by the Production Gate).
- `tools/build_home_social_card.py`: regenerates the author-led homepage social card.

## Known state

- The author portrait (`assets/gareth-mackenzie-author.jpeg`, plus 640/1200 WebP variants) is 1278x872 and must stay that size: the `width`/`height` attributes on `/`, `/about/` and `/media/` assume it. The JPEG has a 1px grey column on its left edge; on `/about/` the image is scaled up 1.2% inside a clipped frame so that column is not visible.
- Analytics consent banner styles live in `dist/site.css`.
- Verify real typography in a browser after changes: the font files are served from `assets/fonts/`.

## Shared theme and two-book homepage

`dist/site.css` owns the obsidian/alabaster tokens for every page. Each document restores `mackenzie_theme` before styles paint; the shared header control in `script.js` persists changes. Large headings retain the exact palette gold. Small text uses the dedicated gold-eyebrow token in each theme.

`assets/codex/books.js` contains exactly two editions and their purchase links. Covers open accessible readers. The fixed ledger selects a scroll stop. The transparent Three.js scene has two hardcover groups and 1,600 drifting dust points, with reduced-motion and semantic fallbacks. Browser QA covers themes, resizing, both directions of scrolling, readers and mobile safe-area layouts.

## Sovereign editorial runtime

Every entry document loads the same five stylesheets, in the same order: site,
pages, author-home, insight-article, and editorial-views. This keeps History API
navigation and direct entry visually consistent. The light theme uses
`data-theme="light"`; older saved `alabaster` preferences remain supported.

- `assets/codex/materials.js`: 1024 × 1536 procedural cover artwork, raster
  replacement, separate foil metalness/roughness maps, sRGB albedo and linear
  data textures. A missing cover leaves the procedural version intact.
- `assets/codex/scene.js`: one transparent renderer and fixed
  `#webgl-stage`, hardcover assembly, adaptive hero camera, bone-rigged reader,
  and a `trackedViews` Map for independently clipped book/essay scenes.
- `assets/codex/router.js`: home, catalogue, writing, all ten essays, biography,
  media, contact, both book details, and legal routes retain the renderer.
- Embedded scenes are disposed on route changes. Only visible viewports render.
  Software rendering is opt-in; semantic covers and the text reader remain usable
  when WebGL is unavailable. Reduced motion disables ornamental animation.
- Amazon destinations belong to their individual volumes. BUILT retains its
  verified retailer link rather than sending its readers to the second book.

### Reader editorial sources

The six reader pages use the existing repository's approved material. The second
volume includes its contents and Chapter 1 excerpt. BUILT uses a clearly labelled
book overview and companion essay list; no unsupplied epigraph or manuscript
excerpt is represented as an authentic quotation.

### Local verification

Serve the repository root on port 4173, then run `tools/site_qa.py`,
`tools/validate_site.py`, and `tools/codex_qa.mjs`. Browser tests require
Playwright and @axe-core/playwright. Set `CHROME_PATH` to use an installed
Chromium browser; otherwise Playwright uses its managed browser.
