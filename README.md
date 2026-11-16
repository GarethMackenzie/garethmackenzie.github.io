# Gareth Andrew Mackenzie

Author website for Gareth Andrew Mackenzie. The author is the brand; *BUILT:
How Wealth Is Deliberately Constructed* and *When Advantage Expires* are his two books.

Live site: https://mackenziebooks.bbroot.com/ (custom domain; GitHub Pages)

## Domain

- The `CNAME` file in the repo root holds the custom domain (`mackenziebooks.bbroot.com`). Do not delete it: removing it unpublishes the custom domain.
- DNS (at the registrar/DNS host): a `CNAME` record for `mackenziebooks` pointing to `garethmackenzie.github.io`.
- GitHub: Settings > Pages > Custom domain, then tick "Enforce HTTPS" once the certificate is issued.
- With the custom domain set, `garethmackenzie.github.io` redirects to it.
- Canonical URLs, Open Graph URLs, JSON-LD, `sitemap.xml` and `robots.txt` use `https://mackenziebooks.bbroot.com/`.
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
`insight-article.css`. All navigation uses ordinary document links. These are authored files with no CSS build
step. Newsreader and Instrument Sans remain self-hosted under `assets/fonts/`.

## Validation

```
python3 tools/validate_site.py
```

Checks heading structure, internal links, image alt text, and sitemap coverage.

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

## Editorial runtime

`dist/site.css` owns the dark/light tokens, fonts, header, footer and controls.
`dist/pages.css` lays out interior pages. `dist/author-home.css` contains book
presentations, the homepage and the reading preview. `insight-article.css` styles
all ten essays. These are authored files with no CSS build step.

`script.js` enhances navigation, theme persistence and contact status.
`analytics.js` gates analytics behind consent. There is no WebGL renderer,
client-side router, scroll pinning or animation dependency.

Each document restores `mackenzie_theme` before styles paint. Saved `alabaster`
preferences remain supported as light. Both books appear as full static covers;
each has its own Amazon destination, preview and detail link.

`assets/books.js` preserves the approved six pages per book and purchase URLs.
`assets/reader.js` enhances preview links with a native HTML dialog: text,
previous/next controls, page status, persistent purchase link, Escape, focus
containment and restoration. Without JavaScript those same links reach ordinary
expandable samples in the detail pages. Keep inline and dialog content in sync;
the editorial test verifies the dialog text against the approved data.

BUILT's preview is explicitly a book overview and companion essays, not a
manuscript excerpt. When Advantage Expires retains its verified contents and
Chapter 1 excerpt. No new manuscript passages or epigraphs have been supplied.

## Local verification

Serve the repository root on port 4173. Browser tests use Playwright and
@axe-core/playwright (`npm install --no-save playwright @axe-core/playwright`).
Set `CHROME_PATH` for an installed Chromium browser, or install the managed
browsers with `npx playwright install chromium firefox webkit`.

```sh
python tools/site_qa.py
python tools/validate_site.py
python tools/verify_artifact.py _site --stage
node tools/editorial_qa.mjs
node tools/browser_qa.mjs
node tools/semantic_qa.mjs
node tools/cross_browser_qa.mjs
```

`BASE_URL` can override the local URL. Screenshots and results are written under
`qa-reports/` (ignored by Git). CI retains accessibility, cross-browser, generated
asset, production artifact and Lighthouse budgets. The production check verifies
release identity and source hashes before checking visible book and reader flows.

See `docs/editorial-validation.md` for the redesign evidence. Earlier Sovereign
validation documents describe the retired implementation, not the current runtime.
