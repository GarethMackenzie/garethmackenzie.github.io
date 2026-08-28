import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
PRIMARY = "https://garethmackenzie.github.io"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.h1_count = 0
        self.images = []
        self.links = []
        self.json_ld = []
        self._json_buffer = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "h1":
            self.h1_count += 1
        if tag == "img":
            self.images.append(values)
        if tag in {"a", "link", "script", "img", "source"}:
            for key in ("href", "src"):
                if values.get(key):
                    self.links.append(values[key])
            for item in values.get("srcset", "").split(","):
                if item.strip():
                    self.links.append(item.strip().split()[0])
        if tag == "script" and values.get("type") == "application/ld+json":
            self._json_buffer = []

    def handle_data(self, data):
        if self._json_buffer is not None:
            self._json_buffer.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._json_buffer is not None:
            self.json_ld.append("".join(self._json_buffer))
            self._json_buffer = None


def local_target(url: str) -> Path | None:
    if not url.startswith("/") or url.startswith("//"):
        return None
    clean = urlsplit(url).path.lstrip("/")
    if not clean:
        return ROOT / "index.html"
    target = ROOT / clean
    return target / "index.html" if clean.endswith("/") else target


errors = []
pages = sorted(ROOT.rglob("index.html"))
for page in pages:
    text = page.read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(text)
    relative = page.relative_to(ROOT).as_posix()

    if parser.h1_count != 1:
        errors.append(f"{relative}: expected one h1, found {parser.h1_count}")
    if "built-gareth-mackenzie.garethmackenzie.workers.dev" in text:
        errors.append(f"{relative}: old Workers domain remains")
    if "https://a.co/d/07Qr0WAn" in text:
        errors.append(f"{relative}: old Amazon link remains")
    if 'src="/analytics.js"' not in text:
        errors.append(f"{relative}: analytics.js is missing")
    if not re.search(r'<link rel="canonical" href="https://garethmackenzie\.github\.io/', text):
        errors.append(f"{relative}: canonical is not on the primary domain")

    for image in parser.images:
        if "alt" not in image:
            errors.append(f"{relative}: image is missing alt text")
    for block in parser.json_ld:
        try:
            json.loads(block)
        except json.JSONDecodeError as error:
            errors.append(f"{relative}: invalid JSON-LD ({error})")
    for link in parser.links:
        target = local_target(link)
        if target is not None and not target.exists():
            errors.append(f"{relative}: missing local target {link}")

tree = ET.parse(ROOT / "sitemap.xml")
locations = [element.text for element in tree.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
if len(locations) != 6 or any(not location.startswith(PRIMARY) for location in locations):
    errors.append("sitemap.xml: expected six GitHub Pages URLs")

robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
if f"Sitemap: {PRIMARY}/sitemap.xml" not in robots:
    errors.append("robots.txt: sitemap declaration is missing")

if errors:
    print("\n".join(errors))
    sys.exit(1)

print(f"Validated {len(pages)} HTML pages, {len(locations)} sitemap URLs, and all local assets.")
