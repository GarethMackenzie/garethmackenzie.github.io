from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://garethmackenzie.github.io"
NOINDEX_ROUTES = {"/privacy/", "/terms/"}
REQUIRED_OG = {
    "og:type",
    "og:site_name",
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:type",
    "og:image:alt",
}
REQUIRED_TWITTER = {
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.title_parts: list[str] = []
        self.h1 = 0
        self.headings: list[int] = []
        self.ids: list[str] = []
        self.hrefs: list[str] = []
        self.images: list[dict[str, str]] = []
        self.buttons: list[dict[str, str]] = []
        self.controls: list[dict[str, str]] = []
        self.labels_for: set[str] = set()
        self.meta_name: dict[str, str] = {}
        self.meta_property: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.jsonld: list[str] = []
        self._jsonld_depth = 0
        self._jsonld_parts: list[str] = []
        self.html_lang = ""

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {k: (v or "") for k, v in attrs_list}
        self.stack.append(tag)
        if tag == "html":
            self.html_lang = attrs.get("lang", "")
        if tag == "meta":
            if attrs.get("name"):
                self.meta_name[attrs["name"]] = attrs.get("content", "")
            if attrs.get("property"):
                self.meta_property[attrs["property"]] = attrs.get("content", "")
        if tag == "link":
            self.links.append(attrs)
        if tag == "a" and attrs.get("href"):
            self.hrefs.append(attrs["href"])
        if tag == "img":
            self.images.append(attrs)
        if tag == "button":
            self.buttons.append(attrs)
        if tag in {"input", "select", "textarea"}:
            self.controls.append(attrs)
        if tag == "label" and attrs.get("for"):
            self.labels_for.add(attrs["for"])
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if re.fullmatch(r"h[1-6]", tag):
            level = int(tag[1])
            self.headings.append(level)
            if level == 1:
                self.h1 += 1
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self._jsonld_depth = len(self.stack)
            self._jsonld_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._jsonld_depth:
            self.jsonld.append("".join(self._jsonld_parts).strip())
            self._jsonld_depth = 0
            self._jsonld_parts = []
        if self.stack:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self.stack and self.stack[-1] == "title":
            self.title_parts.append(data)
        if self._jsonld_depth:
            self._jsonld_parts.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()

    def canonical(self) -> str:
        for link in self.links:
            if link.get("rel") == "canonical":
                return link.get("href", "")
        return ""


def route_for(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    raise ValueError(rel)


def expected_canonical(route: str) -> str:
    return f"{SITE}{route}"


def target_exists(href: str, current_route: str) -> bool:
    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
        return True
    parsed = urlparse(href)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc != "garethmackenzie.github.io":
            return True
        path = parsed.path or "/"
    elif href.startswith("#"):
        return True
    elif href.startswith("/"):
        path = parsed.path
    else:
        base = Path(current_route.lstrip("/"))
        path = "/" + str((base / parsed.path).as_posix())

    path = unquote(path)
    if path == "/":
        return (ROOT / "index.html").exists()
    candidate = ROOT / path.lstrip("/")
    if path.endswith("/"):
        candidate = candidate / "index.html"
    return candidate.exists()


def duplicate_values(values: list[str]) -> set[str]:
    seen: set[str] = set()
    dupes: set[str] = set()
    for value in values:
        if value in seen:
            dupes.add(value)
        seen.add(value)
    return dupes


def jsonld_types(value) -> set[str]:
    types: set[str] = set()
    if isinstance(value, dict):
        t = value.get("@type")
        if isinstance(t, str):
            types.add(t)
        elif isinstance(t, list):
            types.update(x for x in t if isinstance(x, str))
        for child in value.values():
            types |= jsonld_types(child)
    elif isinstance(value, list):
        for child in value:
            types |= jsonld_types(child)
    return types


def audit() -> int:
    failures: list[str] = []
    warnings: list[str] = []
    parsed_pages: dict[str, PageParser] = {}

    html_paths = sorted(ROOT.glob("**/index.html"))
    html_paths = [p for p in html_paths if ".git" not in p.parts and "node_modules" not in p.parts]

    for path in html_paths:
        route = route_for(path)
        text = path.read_text(encoding="utf-8")
        parser = PageParser()
        parser.feed(text)
        parsed_pages[route] = parser
        label = path.relative_to(ROOT).as_posix()

        if parser.html_lang.lower() != "en":
            failures.append(f"{label}: html lang must be en")
        if not parser.title:
            failures.append(f"{label}: missing <title>")
        if not parser.meta_name.get("description"):
            failures.append(f"{label}: missing meta description")
        if parser.h1 != 1:
            failures.append(f"{label}: expected exactly one h1, found {parser.h1}")
        if parser.canonical() != expected_canonical(route):
            failures.append(f"{label}: canonical mismatch ({parser.canonical()!r})")

        robots = parser.meta_name.get("robots", "").lower()
        if route in NOINDEX_ROUTES:
            if "noindex" not in robots or "follow" not in robots:
                failures.append(f"{label}: legal page must be noindex, follow")
        else:
            if "index" not in robots or "follow" not in robots:
                failures.append(f"{label}: public page must be index, follow")
            missing_og = REQUIRED_OG - set(parser.meta_property)
            missing_tw = REQUIRED_TWITTER - set(parser.meta_name)
            if missing_og:
                failures.append(f"{label}: missing Open Graph fields {sorted(missing_og)}")
            if missing_tw:
                failures.append(f"{label}: missing Twitter fields {sorted(missing_tw)}")
            if parser.meta_name.get("theme-color") != "#11151a":
                failures.append(f"{label}: theme-color must be #11151a")

        dupes = duplicate_values([x for x in parser.ids if x])
        if dupes:
            failures.append(f"{label}: duplicate ids {sorted(dupes)}")

        for image in parser.images:
            if "alt" not in image:
                failures.append(f"{label}: image missing alt ({image.get('src', 'unknown')})")
            if not image.get("width") or not image.get("height"):
                failures.append(f"{label}: image missing explicit dimensions ({image.get('src', 'unknown')})")

        for button in parser.buttons:
            if not button.get("type"):
                failures.append(f"{label}: button missing explicit type")

        for control in parser.controls:
            control_type = control.get("type", "").lower()
            if control_type == "hidden":
                continue
            control_id = control.get("id", "")
            has_name = bool(control.get("name"))
            has_label = bool(control_id and control_id in parser.labels_for)
            has_aria = bool(control.get("aria-label") or control.get("aria-labelledby"))
            if not has_name:
                failures.append(f"{label}: form control missing name ({control_id or control.get('type', 'control')})")
            if not (has_label or has_aria):
                failures.append(f"{label}: form control lacks accessible label ({control_id or control.get('name', 'control')})")

        for href in parser.hrefs:
            if not target_exists(href, route):
                failures.append(f"{label}: broken internal href {href}")
            if href.startswith("#") and href[1:] and href[1:] not in parser.ids:
                failures.append(f"{label}: fragment target missing for {href}")

        for match in re.finditer(r"<a\b([^>]*\btarget=\"_blank\"[^>]*)>", text, flags=re.I):
            attrs = match.group(1)
            rel_match = re.search(r"\brel=\"([^\"]*)\"", attrs, flags=re.I)
            rel_tokens = set(rel_match.group(1).lower().split()) if rel_match else set()
            if "noopener" not in rel_tokens:
                failures.append(f"{label}: target=_blank link missing rel=noopener")

        for raw in parser.jsonld:
            try:
                json.loads(raw)
            except Exception as exc:
                failures.append(f"{label}: invalid JSON-LD ({exc})")

        previous = None
        for level in parser.headings:
            if previous is not None and level > previous + 1:
                warnings.append(f"{label}: heading level jumps h{previous} -> h{level}")
            previous = level

        if "/future/" in text:
            failures.append(f"{label}: deleted /future/ concept reference reintroduced")

        if route.startswith("/insights/") and route != "/insights/":
            parsed_types: set[str] = set()
            for raw in parser.jsonld:
                try:
                    parsed_types |= jsonld_types(json.loads(raw))
                except Exception:
                    pass
            if "Article" not in parsed_types:
                failures.append(f"{label}: insight article missing Article schema")
            if "BreadcrumbList" not in parsed_types:
                failures.append(f"{label}: insight article missing BreadcrumbList schema")
            for field in ("article:published_time", "article:modified_time", "article:section", "article:author"):
                if field not in parser.meta_property:
                    failures.append(f"{label}: missing {field}")

    indexed = {route: page for route, page in parsed_pages.items() if route not in NOINDEX_ROUTES}
    for attr, getter in (
        ("title", lambda p: p.title),
        ("canonical", lambda p: p.canonical()),
        ("meta description", lambda p: p.meta_name.get("description", "")),
    ):
        reverse: dict[str, list[str]] = {}
        for route, page in indexed.items():
            value = getter(page)
            reverse.setdefault(value, []).append(route)
        for value, routes in reverse.items():
            if value and len(routes) > 1:
                failures.append(f"duplicate {attr} across {routes}: {value!r}")

    sitemap_path = ROOT / "sitemap.xml"
    tree = ET.parse(sitemap_path)
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_urls = {node.text.strip() for node in tree.findall("s:url/s:loc", namespace) if node.text}
    indexed_urls = {expected_canonical(route) for route in indexed}
    if sitemap_urls != indexed_urls:
        missing = sorted(indexed_urls - sitemap_urls)
        extra = sorted(sitemap_urls - indexed_urls)
        if missing:
            failures.append(f"sitemap missing indexable URLs: {missing}")
        if extra:
            failures.append(f"sitemap contains unexpected URLs: {extra}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "User-agent: *" not in robots or "Allow: /" not in robots:
        failures.append("robots.txt must allow the public site")
    if f"Sitemap: {SITE}/sitemap.xml" not in robots:
        failures.append("robots.txt must declare the canonical sitemap")

    pass1 = (ROOT / "pass1-stability.css").read_text(encoding="utf-8")
    for token in (":focus-visible", "prefers-reduced-motion", "max-width: 1024px", "object-fit: contain"):
        if token not in pass1:
            failures.append(f"pass1-stability.css missing guardrail: {token}")

    script = (ROOT / "script.js").read_text(encoding="utf-8")
    for token in ("aria-expanded", "Escape", "inert", "IntersectionObserver", "requestAnimationFrame"):
        if token not in script:
            failures.append(f"script.js missing interaction guardrail: {token}")

    # Responsive image performance guardrails: the mobile DPR2 path should use
    # the 640px rendition rather than falling through to the 800px file.
    home_source = (ROOT / "index.html").read_text(encoding="utf-8")
    cover_640 = ROOT / "assets" / "book-cover-640.webp"
    if not cover_640.exists():
        failures.append("missing assets/book-cover-640.webp responsive cover")
    elif cover_640.stat().st_size > 125_000:
        failures.append(
            f"book-cover-640.webp exceeds 125 KB budget ({cover_640.stat().st_size:,} bytes)"
        )
    if "book-cover-640.webp 640w" not in home_source:
        failures.append("homepage responsive srcset is missing the 640w cover")
    if not re.search(r'<link rel="preload"[^>]+book-cover-640\.webp[^>]+imagesrcset=', home_source):
        failures.append("homepage cover preload is not using responsive imagesrcset")

    # Operational warnings are intentionally non-blocking because they require a
    # product/service decision rather than a safe code-only correction.
    contact_source = (ROOT / "contact" / "index.html").read_text(encoding="utf-8")
    if re.search(r'formsubmit\.co/(?:ajax/)?[^"\s>]*@', contact_source, flags=re.I):
        warnings.append("contact form endpoint exposes the recipient email address in public HTML")
    if 'name="_captcha" value="false"' in contact_source:
        warnings.append("contact form disables provider CAPTCHA; honeypot is the primary anti-spam control")
    if not (ROOT / "404.html").exists():
        warnings.append("no custom 404.html; unknown URLs use the default GitHub Pages error experience")

    print(f"Audited {len(parsed_pages)} HTML pages.")
    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for warning in warnings:
            print(f"  WARN {warning}")
    if failures:
        print(f"Failures ({len(failures)}):")
        for failure in failures:
            print(f"  FAIL {failure}")
        return 1

    print("Source QA passed with no blocking defects.")
    return 0


if __name__ == "__main__":
    sys.exit(audit())
