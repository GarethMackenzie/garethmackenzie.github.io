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

Navigation order/labels are the same on every page: About, Writing, Books, Media, Contact.
There is no BUILT button in the global navigation: BUILT is the current flagship inside Books, so the structure still works when later titles arrive.

## Stylesheets

Every page loads `dist/site.css` first (fonts, layout tokens, header, footer, buttons, consent banner), then one page stylesheet:

| Pages | Page stylesheet |
|---|---|
| `/` | `dist/author-home.css` |
| About, Books, BUILT, Media, Contact, Writing index, Privacy, Terms, 404 | `dist/pages.css` |
| `/insights/<slug>/` (10 essays) | `dist/pages.css` + `insight-article.css` |

All of these are edited directly. There is no build step for them.

**Layout grid.** One set of tokens in `dist/site.css` drives every page: `--page-max` (1320px content width), `--gutter` (page margin, 24px on small screens up to 72px), `--col-gap`, twelve columns, `--section-y` (section spacing), `--measure` (40rem reading column) and `--header-h`. The header, footer and every section align to the same left edge. Two-column pages use one split: a left rail in columns 1-5 and content in columns 6-12. Essays keep the narrower `--measure` column inside the same 12-column grid.

**Fonts.** Newsreader (variable, optical size) and Instrument Sans (variable) are self-hosted as latin WOFF2 subsets in `assets/fonts/`, under the SIL Open Font License 1.1 (full text in `assets/fonts/LICENSE.txt`). They are preloaded in every page head. `dist/site.css` also declares metric-adjusted local fallbacks so headlines keep their line breaks while the web fonts load. GitHub Pages serves static files with `Cache-Control: max-age=600`, so returning visitors revalidate the font files after ten minutes.

**Books catalogue.** `/books/` is a list of `.catalogue-entry` items. Each carries `data-status`. To add a title, add another `li.catalogue-entry`; when BUILT is no longer the flagship, remove the `catalogue-entry--flagship` modifier and change its status label to "Published work".

**Legacy build pipeline (not used by any page).** `dist/interior.css`, `dist/home.css`, the source files they are bundled from (`styles.css`, `cover.css`, `theme.css`, `premium-*.css`, `pages.css`, `site-tuning.css`, `pass1-stability.css` and others), `insights-publishing.css`, `tools/build_css.py`, `tools/build_performance_assets.py` and `.github/workflows/regenerate-site.yml` are left in place because CI still references them. `tools/site_qa.py` checks `pass1-stability.css`, and the Production Gate workflow lists `insight-article.css` and `insights-publishing.css`. Retiring this pipeline needs a change to those workflows and checks.

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

- The author portrait (`assets/gareth-mackenzie-author.jpeg`, plus 640/1200 WebP variants) is 1278x872 and must stay that size: the `width`/`height` attributes on `/`, `/about/` and `/media/` assume it. The JPEG has a 1px grey column on its left edge; on `/about/` the image is scaled up 1.2% inside a clipped frame so that column is not visible.
- Analytics consent banner styles live in `dist/site.css`.
- Verify real typography in a browser after changes: the font files are served from `assets/fonts/`.
