from pathlib import Path
from PIL import Image
from io import BytesIO
import re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding='utf-8')


def strip_imports(css: str) -> str:
    return re.sub(r'^\s*@import\s+url\([^\n]+\);\s*', '', css, flags=re.MULTILINE)


def bundle(output: str, sources: list[str], *, strip_pages_imports: bool = False) -> None:
    chunks = [
        '/* GENERATED FILE. Edit the source stylesheets, not this bundle. */\n'
    ]
    for source in sources:
        text = read(source)
        if strip_pages_imports and source == 'pages.css':
            text = strip_imports(text)
        chunks.append(f'\n/* source: {source} */\n{text.rstrip()}\n')
    (DIST / output).write_text(''.join(chunks), encoding='utf-8')


# Homepage: omit interior-only premium/page styles and remove the duplicated site-tuning parse.
bundle(
    'home.css',
    [
        'styles.css',
        'cover.css',
        'theme.css',
        'premium-home.css',
        'site-tuning.css',
        'pass1-stability.css',
        'home-editorial.css',
    ],
)

# Interior pages: flatten the previous @import waterfall into one render-blocking request.
bundle(
    'interior.css',
    [
        'styles.css',
        'cover.css',
        'theme.css',
        'premium-pages.css',
        'premium-overrides.css',
        'site-tuning.css',
        'pages.css',
        'pass1-stability.css',
    ],
    strip_pages_imports=True,
)


# Wire the generated bundles into existing HTML without disturbing page-specific CSS.
home = ROOT / 'index.html'
home_text = home.read_text(encoding='utf-8')
home_pattern = re.compile(
    r'\s*<link rel="stylesheet" href="/styles\.css">\s*'
    r'<link rel="stylesheet" href="/cover\.css">\s*'
    r'<link rel="stylesheet" href="/theme\.css">\s*'
    r'<link rel="stylesheet" href="/pages\.css">\s*'
    r'<link rel="stylesheet" href="/premium-home\.css">\s*'
    r'<link rel="stylesheet" href="/site-tuning\.css">\s*'
    r'<link rel="stylesheet" href="/home-editorial\.css">'
)
home_replacement = '\n  <link rel="stylesheet" href="/dist/home.css">'
home_text, home_count = home_pattern.subn(home_replacement, home_text, count=1)
if home_count == 0 and '/dist/home.css' not in home_text:
    raise RuntimeError('Homepage stylesheet sequence was not found')
home.write_text(home_text, encoding='utf-8')

interior_pattern = re.compile(
    r'<link rel="stylesheet" href="/styles\.css">\s*'
    r'<link rel="stylesheet" href="/cover\.css">\s*'
    r'<link rel="stylesheet" href="/theme\.css">\s*'
    r'<link rel="stylesheet" href="/pages\.css">'
)

rewired = 0
for path in ROOT.glob('**/index.html'):
    if path == home or '.git' in path.parts:
        continue
    text = path.read_text(encoding='utf-8')
    updated, count = interior_pattern.subn('<link rel="stylesheet" href="/dist/interior.css">', text, count=1)
    if count:
        path.write_text(updated, encoding='utf-8')
        rewired += 1


# The BUILT cover is below the opening hero, so do not compete with initial text rendering.
built_page = ROOT / 'built' / 'index.html'
built_text = built_page.read_text(encoding='utf-8')
built_text = built_text.replace(
    'alt="Cover of BUILT: How Wealth Is Deliberately Constructed by Gareth Andrew Mackenzie" fetchpriority="high" decoding="async"',
    'alt="Cover of BUILT: How Wealth Is Deliberately Constructed by Gareth Andrew Mackenzie" loading="lazy" decoding="async" fetchpriority="low"',
    1,
)
built_page.write_text(built_text, encoding='utf-8')


# Rebuild responsive WebP covers from the untouched high-resolution JPEG master.
# The target budgets are 10% below the original responsive assets. We choose the
# highest quality level that meets each budget instead of blindly re-encoding.
original_sizes = {
    480: 75348,
    800: 239654,
    1200: 442404,
}
quality_candidates = (82, 80, 78, 76, 74, 72, 70)
source_path = ROOT / 'assets' / 'book-cover.jpg'

with Image.open(source_path) as source:
    source = source.convert('RGB')
    source_width, source_height = source.size

    for width in (480, 800, 1200):
        height = round(source_height * width / source_width)
        resized = source.resize((width, height), Image.Resampling.LANCZOS)
        output = ROOT / 'assets' / f'book-cover-{width}.webp'
        before = output.stat().st_size if output.exists() else 0
        target = int(original_sizes[width] * 0.90)

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

print(f'Built CSS bundles; rewired {rewired} interior pages.')
