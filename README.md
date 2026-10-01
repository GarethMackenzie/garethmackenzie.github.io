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

Source stylesheets (`styles.css`, `theme.css`, `premium-pages.css`, etc.)
are bundled into `dist/home.css` and `dist/interior.css`. **Edit the source
files, never `dist/*.css` directly** — it's overwritten on every build.

```
python3 tools/build_css.py
```

Run this after any source CSS change, before committing. It's idempotent —
safe to run even with nothing changed.

`tools/build_performance_assets.py` is a one-time migration script (HTML
rewrites + image generation already applied) and should not be rerun.

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

This repo has had several rounds of fixes prepared (branding/nav
consistency, two JS bugs, missing Google Fonts loading that meant the whole
site was rendering in system-font fallbacks, dead CSS cleanup, a baked-in
border on the author portrait, and new CSS for `.author-hero` and
`.contact-strip`, which previously had no styling at all). Check `git log`
and the current state of `dist/*.css` against this README's date before
assuming all of the above is live — confirm in a real browser, not an
in-app webview.
