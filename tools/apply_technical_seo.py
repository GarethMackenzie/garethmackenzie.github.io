from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://garethmackenzie.github.io'
PERSON_ID = f'{SITE}/about/#person'
SOCIAL = f'{SITE}/assets/social-card.jpg'
SOCIAL_ALT = 'BUILT: How Wealth Is Deliberately Constructed by Gareth Andrew Mackenzie'

ESSAYS = [
    ('capital-allocation', 'Capital Allocation Is the Operating System of Wealth', 'Capital allocation'),
    ('leverage', 'Leverage Should Multiply a System, Not a Weakness', 'Leverage'),
    ('asymmetric-risk', 'Design the Shape of the Risk Before You Chase the Upside', 'Asymmetric risk'),
    ('business-systems', 'A System Turns Good Decisions Into Repeatable Outcomes', 'Business systems'),
    ('decision-making', 'Decision Quality Depends on the Frame Before the Choice', 'Decision-making'),
    ('compounding', 'Compounding Rewards Continuity More Than Intensity', 'Compounding'),
    ('information-advantage', 'Information Advantage Is About Better Decisions, Not More Data', 'Information advantage'),
    ('ownership', 'Ownership Changes the Relationship Between Effort and Outcome', 'Ownership'),
    ('scale', 'Scale Should Expand What Already Works', 'Scale'),
    ('strategic-execution', 'Strategy Becomes Real Only When Execution Has a System', 'Strategic execution'),
]

FOUNDATION_DESTINATIONS = {
    'Capital': '/insights/capital-allocation/',
    'Leverage': '/insights/leverage/',
    'Risk': '/insights/asymmetric-risk/',
    'Systems': '/insights/business-systems/',
    'Information': '/insights/information-advantage/',
    'Scale': '/insights/scale/',
    'Compounding': '/insights/compounding/',
}


def set_or_add_meta(text: str, key: str, value: str, attr: str = 'property', after: str | None = None) -> str:
    pattern = re.compile(rf'<meta\s+{attr}="{re.escape(key)}"\s+content="[^"]*">')
    tag = f'<meta {attr}="{key}" content="{value}">'
    if pattern.search(text):
        return pattern.sub(tag, text, count=1)
    if after:
        anchor = re.compile(rf'(<meta\s+{attr}="{re.escape(after)}"\s+content="[^"]*">)')
        if anchor.search(text):
            return anchor.sub(rf'\1{tag}', text, count=1)
    return text.replace('</head>', f'  {tag}\n</head>', 1)


def add_breadcrumbs(text: str, items: list[tuple[str, str]]) -> str:
    if 'data-seo-breadcrumbs' in text:
        return text
    schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': index,
                'name': name,
                'item': url,
            }
            for index, (name, url) in enumerate(items, start=1)
        ],
    }
    script = '<script type="application/ld+json" data-seo-breadcrumbs>' + json.dumps(schema, ensure_ascii=False, separators=(',', ':')) + '</script>'
    return text.replace('</head>', f'  {script}\n</head>', 1)


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8')


def standardize_social(path: Path, alt: str = SOCIAL_ALT) -> None:
    text = path.read_text(encoding='utf-8')
    text = text.replace('<meta name="theme-color" content="#080a0c">', '<meta name="theme-color" content="#11151a">')
    text = set_or_add_meta(text, 'og:image:width', '1200', 'property', 'og:image')
    text = set_or_add_meta(text, 'og:image:height', '630', 'property', 'og:image:width')
    text = set_or_add_meta(text, 'og:image:type', 'image/jpeg', 'property', 'og:image:height')
    text = set_or_add_meta(text, 'og:image:alt', alt, 'property', 'og:image:type')
    text = set_or_add_meta(text, 'twitter:image:alt', alt, 'name', 'twitter:image')
    write(path, text)


def link_person_entity(text: str) -> str:
    """Add the site's stable Person @id to common inline Person objects."""
    # Homepage publisher object.
    text = text.replace(
        '"publisher": {\n      "@type": "Person",\n      "name": "Gareth Andrew Mackenzie",',
        f'"publisher": {{\n      "@type": "Person",\n      "@id": "{PERSON_ID}",\n      "name": "Gareth Andrew Mackenzie",\n      "url": "{SITE}/about/",',
        1,
    )
    # Compact JSON-LD Person author/publisher objects used on interior pages.
    text = text.replace(
        '{"@type":"Person","name":"Gareth Andrew Mackenzie","url":"https://garethmackenzie.github.io/about/"}',
        f'{{"@type":"Person","@id":"{PERSON_ID}","name":"Gareth Andrew Mackenzie","url":"{SITE}/about/"}}',
    )
    text = text.replace(
        '{"@type":"Person","name":"Gareth Andrew Mackenzie"}',
        f'{{"@type":"Person","@id":"{PERSON_ID}","name":"Gareth Andrew Mackenzie","url":"{SITE}/about/"}}',
    )
    return text


# Main-page social metadata consistency.
for relative in ['index.html', 'built/index.html', 'about/index.html', 'media/index.html', 'contact/index.html']:
    standardize_social(ROOT / relative)

# Keep legal pages visually consistent while intentionally remaining noindex.
for relative in ['privacy/index.html', 'terms/index.html']:
    path = ROOT / relative
    text = path.read_text(encoding='utf-8').replace(
        '<meta name="theme-color" content="#080a0c">',
        '<meta name="theme-color" content="#11151a">',
    )
    write(path, text)

# Breadcrumb hierarchy for indexable non-home main pages.
main_breadcrumbs = {
    'built/index.html': [('Home', f'{SITE}/'), ('BUILT', f'{SITE}/built/')],
    'about/index.html': [('Home', f'{SITE}/'), ('About', f'{SITE}/about/')],
    'media/index.html': [('Home', f'{SITE}/'), ('Media', f'{SITE}/media/')],
    'contact/index.html': [('Home', f'{SITE}/'), ('Contact', f'{SITE}/contact/')],
}
for relative, items in main_breadcrumbs.items():
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    write(path, add_breadcrumbs(text, items))

# Contextual linking between the book/author pages and the editorial knowledge layer.
built = ROOT / 'built' / 'index.html'
text = built.read_text(encoding='utf-8')
needle = '<p>The book connects capital, leverage, ownership, risk, execution, information, scale, and compounding into one framework instead of presenting them as isolated tactics.</p>'
addition = needle + '<p>Continue into the <a class="text-link" href="/insights/">BUILT Insights essay series <span aria-hidden="true">→</span></a> for ten long-form explorations of the framework.</p>'
if needle in text and 'BUILT Insights essay series' not in text:
    text = text.replace(needle, addition, 1)
write(built, link_person_entity(text))

about = ROOT / 'about' / 'index.html'
text = about.read_text(encoding='utf-8')
needle = '<p>BUILT applies that same lens to wealth, ownership, leverage, resilience, and choice.</p>'
addition = needle + '<p>The <a class="text-link" href="/insights/">Insights series <span aria-hidden="true">→</span></a> develops that systems lens across ten connected essays.</p>'
if needle in text and 'Insights series' not in text:
    text = text.replace(needle, addition, 1)
write(about, text)

# Make homepage semantics correct without JavaScript: real essay destinations and
# no fake keyboard stops on the explanatory systems diagram.
home = ROOT / 'index.html'
text = home.read_text(encoding='utf-8')
for title, destination in FOUNDATION_DESTINATIONS.items():
    pattern = re.compile(
        rf'(<article class="foundation-card reveal">.*?<h3>{re.escape(title)}</h3>.*?<a) href="[^"]*"(?: aria-label="[^"]*")?',
        flags=re.DOTALL,
    )
    replacement = rf'\1 href="{destination}" aria-label="Read the {title} essay in Insights"'
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f'Could not standardize homepage foundation link for {title}')
text = re.sub(r'(<span class="node[^"]*") tabindex="0"', r'\1', text)
text = link_person_entity(text)
write(home, text)

# Article-specific metadata, linked author entity and three-level breadcrumbs.
for slug, title, theme in ESSAYS:
    path = ROOT / 'insights' / slug / 'index.html'
    text = path.read_text(encoding='utf-8')
    text = set_or_add_meta(text, 'article:published_time', '2026-09-13', 'property', 'og:url')
    text = set_or_add_meta(text, 'article:modified_time', '2026-09-13', 'property', 'article:published_time')
    text = set_or_add_meta(text, 'article:section', theme, 'property', 'article:modified_time')
    text = set_or_add_meta(text, 'article:author', f'{SITE}/about/', 'property', 'article:section')
    text = link_person_entity(text)
    text = add_breadcrumbs(text, [
        ('Home', f'{SITE}/'),
        ('Insights', f'{SITE}/insights/'),
        (title, f'{SITE}/insights/{slug}/'),
    ])
    write(path, text)

# Insights already has BreadcrumbList in its @graph. Keep the source theme color aligned.
insights = ROOT / 'insights' / 'index.html'
text = insights.read_text(encoding='utf-8').replace('<meta name="theme-color" content="#080a0c">', '<meta name="theme-color" content="#11151a">')
write(insights, link_person_entity(text))

print('Technical SEO metadata, breadcrumbs, source semantics and contextual links standardized.')
