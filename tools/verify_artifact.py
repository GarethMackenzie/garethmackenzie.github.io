"""Verify a staged production artifact before it is uploaded to GitHub Pages.

Usage: python tools/verify_artifact.py _site            check an already staged directory (what CI does)
       python tools/verify_artifact.py _site --stage    stage it first, using the file lists in
                                                         .github/workflows/production-gate.yml
Checks: no repository internals ship, every local reference (href, src, srcset, preloads, CSS url(), canonical and
social-image URLs, sitemap entries) resolves inside the artifact, and the pages that must exist do exist.
"""
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE_HOST = "mackenziebooks.bbroot.com"
FORBIDDEN = ["tools", ".github", "docs", "node_modules", "qa-reports", "README.md", "MIGRATION-NOTES.md", "package.json", "package-lock.json"]
REQUIRED = ["index.html", "404.html", "books/index.html", "built/index.html", "about/index.html", "media/index.html", "contact/index.html",
            "insights/index.html", "robots.txt", "sitemap.xml", "dist/site.css", "dist/pages.css", "dist/author-home.css", "insight-article.css",
            "assets/fonts/newsreader-latin-opsz-normal.woff2", "assets/fonts/instrument-sans-latin-wght-normal.woff2", "assets/social-card.jpg", "assets/social-card-home.jpg"]


class References(HTMLParser):
    """Collect real file references: link/anchor/script/image URLs and the social image meta tags."""

    def __init__(self) -> None:
        super().__init__()
        self.found: list[str] = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "meta":
            if attributes.get("property") in ("og:image", "og:url") or attributes.get("name") == "twitter:image":
                self.found.append(attributes.get("content") or "")
            return
        if tag in ("a", "link", "script", "img", "source", "iframe", "video", "audio"):
            for name in ("href", "src", "poster"):
                if attributes.get(name):
                    self.found.append(attributes[name])
            for name in ("srcset", "imagesrcset"):
                for part in (attributes.get(name) or "").split(","):
                    if part.strip():
                        self.found.append(part.split()[0])


def stage(target: Path) -> None:
    gate = (ROOT / ".github" / "workflows" / "production-gate.yml").read_text(encoding="utf-8")
    lists = {name: re.search(rf"{name}=\(\n(.*?)\n\s*\)", gate, re.S).group(1).split() for name in ("runtime_files", "runtime_dirs")}
    shutil.rmtree(target, ignore_errors=True)
    target.mkdir(parents=True)
    for name in lists["runtime_files"]:
        shutil.copy2(ROOT / name, target / name)
    for name in lists["runtime_dirs"]:
        shutil.copytree(ROOT / name, target / name)


def resolve(base: Path, reference: str, page: Path):
    reference = reference.strip()
    if not reference or reference.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return None
    parsed = urlparse(reference)
    if parsed.scheme in ("http", "https"):
        if parsed.netloc != SITE_HOST:
            return None
        path = parsed.path
    elif parsed.scheme or parsed.netloc:
        return None
    else:
        path = parsed.path
    if not path:
        return None
    target = base / path.lstrip("/") if path.startswith("/") else (page.parent / path)
    target = Path(unquote(str(target)))
    return target / "index.html" if path.endswith("/") or target.is_dir() else target


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    base = (ROOT / args[0]).resolve()
    if "--stage" in sys.argv:
        stage(base)
    problems = []
    for name in FORBIDDEN:
        if (base / name).exists():
            problems.append(f"forbidden path ships: {name}")
    for name in REQUIRED:
        if not (base / name).exists():
            problems.append(f"required file missing: {name}")
    for path in base.rglob("*"):
        if path.is_file() and path.suffix in (".py", ".mjs", ".patch", ".yml", ".md"):
            problems.append(f"source/internal file ships: {path.relative_to(base)}")
    references = 0
    for page in sorted(base.rglob("*.html")):
        text = page.read_text(encoding="utf-8")
        collector = References()
        collector.feed(text)
        refs = collector.found
        for reference in refs:
            target = resolve(base, reference, page)
            if target is None:
                continue
            references += 1
            if not target.exists():
                problems.append(f"{page.relative_to(base)}: {reference} does not resolve inside the artifact")
    for stylesheet in list(base.rglob("*.css")):
        for reference in re.findall(r"url\(([^)]+)\)", stylesheet.read_text(encoding="utf-8")):
            target = resolve(base, reference.strip("'\""), stylesheet)
            if target is not None:
                references += 1
                if not target.exists():
                    problems.append(f"{stylesheet.relative_to(base)}: url({reference}) does not resolve")
    for loc in re.findall(r"<loc>([^<]+)</loc>", (base / "sitemap.xml").read_text(encoding="utf-8")):
        target = resolve(base, loc, base / "sitemap.xml")
        references += 1
        if target is None or not target.exists():
            problems.append(f"sitemap URL does not resolve: {loc}")
    files = [p for p in base.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    print(f"Artifact: {len(files)} files, {total / 1024:.0f} KB, {references} local references checked.")
    if problems:
        print("\n".join(f"FAIL {p}" for p in sorted(set(problems))))
        sys.exit(1)
    print("Artifact verification passed.")


if __name__ == "__main__":
    main()
