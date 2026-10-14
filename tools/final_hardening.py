from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def update(path: Path, transform):
    original = path.read_text(encoding='utf-8')
    revised = transform(original)
    if revised != original:
        path.write_text(revised, encoding='utf-8')
        print(f'Updated {path.relative_to(ROOT)}')



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
            left_span = 'All essays'
            left_title = 'Explore all ten essays'
            left_label = 'Return to all essays'
        else:
            pslug, ptitle = series[i - 1]
            left_href = f'/insights/{pslug}/'
            left_span = 'Previous essay'
            left_title = ptitle
            left_label = f'Previous essay: {ptitle}'

        if i == len(series) - 1:
            right_href = '/insights/'
            right_span = 'Complete the series'
            right_title = 'Return to the full list of essays'
            right_label = 'Return to all essays'
        else:
            nslug, ntitle = series[i + 1]
            right_href = f'/insights/{nslug}/'
            right_span = 'Next essay'
            right_title = ntitle
            right_label = f'Next essay: {ntitle}'

        nav = (
            '<nav class="article-nav" aria-label="More essays">'
            f'<a href="{left_href}" aria-label="{left_label}"><span>{left_span}</span><strong>{left_title}</strong></a>'
            f'<a href="{right_href}" aria-label="{right_label}"><span>{right_span}</span><strong>{right_title}</strong></a>'
            '</nav>'
        )
        return re.sub(r'<nav class="article-nav" aria-label="More essays">.*?</nav>', nav, text, count=1, flags=re.S)

    update(path, nav_transform)

print('Final hardening complete.')
