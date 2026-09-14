from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def update(path: Path, transform):
    original = path.read_text(encoding='utf-8')
    revised = transform(original)
    if revised != original:
        path.write_text(revised, encoding='utf-8')
        print(f'Updated {path.relative_to(ROOT)}')


# Homepage: make critical navigation/SEO semantics correct without JavaScript.
def harden_home(text: str) -> str:
    text = text.replace(
        '<link rel="preload" href="/assets/book-cover-800.webp" as="image" type="image/webp" fetchpriority="high">',
        '<link rel="preload" href="/assets/book-cover-800.webp" as="image" type="image/webp" fetchpriority="high" imagesrcset="/assets/book-cover-480.webp 480w, /assets/book-cover-800.webp 800w, /assets/book-cover-1200.webp 1200w" imagesizes="(max-width: 1024px) 340px, 390px">',
    )

    if '"@id": "https://garethmackenzie.github.io/about/#person"' not in text:
        text = text.replace(
            '"@type": "Person",\n      "name": "Gareth Andrew Mackenzie",',
            '"@type": "Person",\n      "@id": "https://garethmackenzie.github.io/about/#person",\n      "name": "Gareth Andrew Mackenzie",',
            1,
        )
    if '"author": {"@id": "https://garethmackenzie.github.io/about/#person"}' not in text:
        text = text.replace(
            '"image": "https://garethmackenzie.github.io/assets/book-cover.jpg",\n      "sameAs": "https://a.co/d/0gLDcpvu"',
            '"image": "https://garethmackenzie.github.io/assets/book-cover.jpg",\n      "author": {"@id": "https://garethmackenzie.github.io/about/#person"},\n      "sameAs": "https://a.co/d/0gLDcpvu"',
            1,
        )

    mapping = {
        'Capital': ('/insights/capital-allocation/', 'Read the Capital allocation insight'),
        'Leverage': ('/insights/leverage/', 'Read the Leverage insight'),
        'Risk': ('/insights/asymmetric-risk/', 'Read the Asymmetric risk insight'),
        'Systems': ('/insights/business-systems/', 'Read the Business systems insight'),
        'Information': ('/insights/information-advantage/', 'Read the Information advantage insight'),
        'Scale': ('/insights/scale/', 'Read the Scale insight'),
        'Compounding': ('/insights/compounding/', 'Read the Compounding insight'),
    }
    for title, (href, label) in mapping.items():
        pattern = re.compile(
            rf'(<article class="foundation-card reveal">.*?<h3>{re.escape(title)}</h3>.*?<a )href="[^"]+"(?: aria-label="[^"]+")?(>Explore <span>\u2192</span></a></article>)',
            re.S,
        )
        text = pattern.sub(rf'\1href="{href}" aria-label="{label}"\2', text, count=1)

    text = re.sub(r'(<span class="node [^"]+") tabindex="0"', r'\1', text)
    return text


update(ROOT / 'index.html', harden_home)

# Legal pages: match the production dark palette in browser chrome/form controls.
for rel in ('privacy/index.html', 'terms/index.html'):
    update(ROOT / rel, lambda t: t.replace('content="#080a0c"', 'content="#11151a"'))

# Contact: keep browser-native validation and make status semantics idempotent.
def harden_contact(text: str) -> str:
    text = text.replace(' novalidate>', '>')
    text = re.sub(
        r'id="form-status" role="status"(?: aria-live="polite")*',
        'id="form-status" role="status" aria-live="polite"',
        text,
        count=1,
    )
    return text


update(ROOT / 'contact/index.html', harden_contact)

# Media download links should have meaningful accessible names without requiring surrounding context.
def harden_media(text: str) -> str:
    text = text.replace('href="/assets/book-cover.jpg" download>Download <span aria-hidden="true">\u2193</span></a>', 'href="/assets/book-cover.jpg" download>Download book cover <span aria-hidden="true">\u2193</span></a>')
    text = text.replace('href="/assets/gareth-mackenzie-author.jpeg" download>Download <span aria-hidden="true">\u2193</span></a>', 'href="/assets/gareth-mackenzie-author.jpeg" download>Download author photo <span aria-hidden="true">\u2193</span></a>')
    return text


update(ROOT / 'media/index.html', harden_media)

# Static article navigation must mirror the JavaScript sequence for no-JS users and crawlers.
series = [
    ('capital-allocation', 'Capital allocation is the operating system of wealth'),
    ('leverage', 'Leverage should multiply a system, not a weakness'),
    ('asymmetric-risk', 'Design the shape of the risk before you chase the upside'),
    ('business-systems', 'A system turns good decisions into repeatable outcomes'),
    ('decision-making', 'Decision quality depends on the frame before the choice'),
    ('compounding', 'Compounding rewards continuity more than intensity'),
    ('information-advantage', 'Information advantage is about better decisions, not more data'),
    ('ownership', 'Ownership changes the relationship between effort and outcome'),
    ('scale', 'Scale should expand what already works'),
    ('strategic-execution', 'Strategy becomes real only when execution has a system'),
]

for i, (slug, title) in enumerate(series):
    path = ROOT / 'insights' / slug / 'index.html'

    def nav_transform(text: str, i=i):
        if i == 0:
            left_href = '/insights/'
            left_span = 'Series index'
            left_title = 'Explore all ten insight themes'
            left_label = 'Return to the Insights series index'
        else:
            pslug, ptitle = series[i - 1]
            left_href = f'/insights/{pslug}/'
            left_span = 'Previous insight'
            left_title = ptitle
            left_label = f'Previous insight: {ptitle}'

        if i == len(series) - 1:
            right_href = '/insights/'
            right_span = 'Complete the series'
            right_title = 'Return to the ten-theme Insights index'
            right_label = 'Return to the complete Insights series index'
        else:
            nslug, ntitle = series[i + 1]
            right_href = f'/insights/{nslug}/'
            right_span = 'Next insight'
            right_title = ntitle
            right_label = f'Next insight: {ntitle}'

        nav = (
            '<nav class="article-nav" aria-label="More BUILT insights">'
            f'<a href="{left_href}" aria-label="{left_label}"><span>{left_span}</span><strong>{left_title}</strong></a>'
            f'<a href="{right_href}" aria-label="{right_label}"><span>{right_span}</span><strong>{right_title}</strong></a>'
            '</nav>'
        )
        return re.sub(r'<nav class="article-nav" aria-label="More BUILT insights">.*?</nav>', nav, text, count=1, flags=re.S)

    update(path, nav_transform)

print('Final hardening complete.')
