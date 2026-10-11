"""Rebuild assets/fonts from the pinned Fontsource packages (SIL Open Font License 1.1).

The site only uses weights 400-600 and a small character set, so each variable font is limited to
that weight range and subset to the characters the pages need. Requires: pip install fonttools brotli
Run from the repository root: python tools/subset_fonts.py
"""
import io
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[1]
CDN = "https://cdn.jsdelivr.net/npm/{package}@5.3.0/files/{name}"
FONTS = [
    ("@fontsource-variable/newsreader", "newsreader-latin-opsz-normal.woff2", {"wght": (400, 600)}),
    ("@fontsource-variable/newsreader", "newsreader-latin-wght-italic.woff2", {"wght": (400, 500)}),
    ("@fontsource-variable/instrument-sans", "instrument-sans-latin-wght-normal.woff2", {"wght": (400, 600)}),
]
# Basic Latin, Latin-1 letters, typographic punctuation, the middle dot and the pound/copyright signs.
UNICODES = (list(range(0x20, 0x7F)) + [0xA0, 0xA3, 0xA9, 0xB7] + list(range(0xC0, 0x100))
            + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2212])

for package, name, limits in FONTS:
    data = urllib.request.urlopen(CDN.format(package=package, name=name), timeout=60).read()
    font = TTFont(io.BytesIO(data))
    font = instancer.instantiateVariableFont(font, limits)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    out = ROOT / "assets" / "fonts" / name
    font.flavor = "woff2"
    font.save(out)
    print(f"{name}: {len(data):,} -> {out.stat().st_size:,} bytes")
