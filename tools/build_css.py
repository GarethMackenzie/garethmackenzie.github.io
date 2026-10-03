"""Regenerate dist/home.css and dist/interior.css from their source stylesheets.

Safe to run any number of times. Unlike build_performance_assets.py (which
also performs one-time HTML/image migration steps and should not be rerun),
this script only bundles CSS and can be part of a normal edit -> rebuild loop.

IMPORTANT: index.html (the homepage) does NOT load dist/home.css. It loads
dist/author-home.css, a separate, hand-maintained file with no build step
and no corresponding source files in this repo -- edit it directly. Only
dist/interior.css (built here) is actually served, to every interior page
(about/, built/, books/, insights/, media/, contact/, privacy/, terms/).
dist/home.css is built here only to keep this script simple; it is not
referenced by any page and can be ignored or removed.

Usage:
    python3 tools/build_css.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

HOME_SOURCES = [
    # premium-home.css deliberately excluded: every rule in it is scoped to
    # the retired `.home-premium` body class (see script.js history), which
    # the current homepage never applies. Verified 177/180 rules dead before
    # removal. Do not re-add without confirming the class is actually in use.
    "styles.css", "cover.css", "theme.css",
    "site-tuning.css", "pass1-stability.css", "home-editorial.css",
    "performance-tuning.css",
]
INTERIOR_SOURCES = [
    "styles.css", "cover.css", "theme.css", "premium-pages.css",
    "premium-overrides.css", "site-tuning.css", "pages.css",
    "pass1-stability.css",
]


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def strip_imports(css: str) -> str:
    return re.sub(r"^\s*@import\s+url\([^\n]+\);\s*", "", css, flags=re.MULTILINE)


def bundle(output: str, sources: list[str], *, strip_pages_imports: bool = False) -> None:
    chunks = ["/* GENERATED FILE. Edit the source stylesheets, not this bundle. */\n"]
    for source in sources:
        text = read(source)
        if strip_pages_imports and source == "pages.css":
            text = strip_imports(text)
        chunks.append(f"\n/* source: {source} */\n{text.rstrip()}\n")
    target = DIST / output
    new_text = "".join(chunks)
    changed = not target.exists() or target.read_text(encoding="utf-8") != new_text
    target.write_text(new_text, encoding="utf-8")
    print(f"{output}: {'updated' if changed else 'already up to date'}")


if __name__ == "__main__":
    bundle("home.css", HOME_SOURCES)
    bundle("interior.css", INTERIOR_SOURCES, strip_pages_imports=True)
