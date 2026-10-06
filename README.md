# Gareth Andrew Mackenzie

Author website for Gareth Andrew Mackenzie. The author is the brand; *BUILT:
How Wealth Is Deliberately Constructed* is his current book, not the site's
identity.

Live site: https://garethmackenzie.github.io/

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
- No rendered visual check has been done in a real desktop or mobile browser. Do that before further CSS changes.
