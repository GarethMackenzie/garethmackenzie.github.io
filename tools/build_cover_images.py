"""Regenerate the responsive WebP renditions of the BUILT cover from assets/book-cover.jpg.

This is the only generated-asset step left from the retired CSS pipeline. Stylesheets are
hand-written (dist/site.css, dist/author-home.css, dist/pages.css, insight-article.css).
"""
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

# Rebuild responsive WebP covers from the untouched high-resolution JPEG master.
# Budgets keep every generated rendition bounded while selecting the highest
# quality candidate that fits. The master JPEG remains unchanged.
size_budgets = {
    480: 68_000,
    640: 125_000,
    800: 200_000,
    1200: 375_000,
}
quality_candidates = (82, 80, 78, 76, 74, 72, 70)
source_path = ROOT / 'assets' / 'book-cover.jpg'

with Image.open(source_path) as source:
    source = source.convert('RGB')
    source_width, source_height = source.size

    for width, target in size_budgets.items():
        height = round(source_height * width / source_width)
        resized = source.resize((width, height), Image.Resampling.LANCZOS)
        output = ROOT / 'assets' / f'book-cover-{width}.webp'
        before = output.stat().st_size if output.exists() else 0

        chosen_bytes = None
        chosen_quality = None
        smallest_bytes = None
        smallest_quality = None

        for quality in quality_candidates:
            buffer = BytesIO()
            resized.save(buffer, 'WEBP', quality=quality, method=6)
            candidate = buffer.getvalue()

            if smallest_bytes is None or len(candidate) < len(smallest_bytes):
                smallest_bytes = candidate
                smallest_quality = quality

            if len(candidate) <= target:
                chosen_bytes = candidate
                chosen_quality = quality
                break

        if chosen_bytes is None:
            chosen_bytes = smallest_bytes
            chosen_quality = smallest_quality

        output.write_bytes(chosen_bytes)
        after = len(chosen_bytes)
        print(
            f'{output.relative_to(ROOT)}: {before:,} -> {after:,} bytes '
            f'(quality {chosen_quality}, target <= {target:,})'
        )
