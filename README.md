# Gareth Andrew Mackenzie

Author website for Gareth Andrew Mackenzie. The author is the brand; *BUILT:
How Wealth Is Deliberately Constructed* is his current book, not the site's
identity.

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
/books/           Books index (currently: BUILT)
/built/           BUILT book page
/insights/        Writing index
/insights/<slug>/ Individual essays (10)
/media/           Press kit: bio, cover, portrait, interview topics
/contact/         Contact form + enquiry routing
/privacy/ /terms/ Legal
```

Navigation order/labels are the same on every page: About, Books, Writing,
Media, Contact, with BUILT as a highlighted CTA — never the site wordmark.

## Stylesheets

Which CSS each page actually loads (verified against the HTML on `main`):

| Page(s) | Stylesheet | How it is maintained |
| --- | --- | --- |
| `/` (homepage) | `dist/author-home.css` | Edited directly. No build step, no source files. |
| All other pages except essays and the writing index | `dist/interior.css` | Built from source files: edit those, then run `python3 tools/build_css.py`. |
| `/insights/<slug>/` (10 essays) | `insight-article.css` (repo root) | Edited directly; also loads `dist/interior.css`. |
| `/insights/` (writing index) | `insights-publishing.css` (repo root) | Edited directly. |

Not loaded by any page (safe to ignore; do not edit expecting a visible change): `dist/home.css`, `home-editorial.css`, `performance-tuning.css`, `premium-home.css`, `premium-home.js`.

```
python3 tools/build_css.py
```

Idempotent. It only affects `dist/interior.css` in practice (it also still writes the unused `dist/home.css`).

`tools/build_performance_assets.py` is a one-time migration script (HTML rewrites + image generation already applied) and should not be rerun.

## Validation

```
python3 tools/validate_site.py
```

Checks heading structure, internal links, image alt text, and sitemap
coverage. Note: as of this commit it reports one known false positive
("sitemap.xml: expected six GitHub Pages URLs") — a hardcoded check from
before the site had a Books page and ten essays; the sitemap itself is
correct.

## Known state

- The author portrait (`assets/gareth-mackenzie-author.jpeg`, plus 640/1200 WebP variants) is cropped inside its baked-in keyline. The JPEG is 1278x872 and must stay that size: the `width`/`height` attributes on `/`, `/about/` and `/media/` assume it.
- The homepage now shares the interior pages' dark palette and type (Playfair Display, Manrope, gold). Its portrait and book cover are separate blocks, not overlapping.
- Analytics consent banner styles live in `pages.css` (and are bundled into `dist/interior.css`) and at the end of `dist/author-home.css`.
- Pages were rendered in headless Chromium at 390, 768 and 1415px with no horizontal overflow or distorted images. Fonts were not loaded in that environment, so check real typography in a browser.
