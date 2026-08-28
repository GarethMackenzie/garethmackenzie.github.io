# BUILT website deployment notes

Primary site: `https://garethmackenzie.github.io/`

The site is published from the `main` branch of this repository. All canonical URLs, Open Graph URLs, structured data, the sitemap, and `robots.txt` use the GitHub Pages domain.

## Active services

- Google Analytics 4 measurement ID: `G-DVZNKJYY2X`
- Consent Mode defaults analytics and advertising storage to denied. Visitors can opt into analytics through the on-page preference banner.
- Amazon CTA clicks are recorded as the GA4 event `amazon_click`.
- Contact messages are routed through FormSubmit to the author's inbox. FormSubmit may require a one-time email activation after the first test submission.

## Assets

The source JPEGs remain available for media downloads. Responsive WebP variants are used on the website, and `tools/optimize_images.py` can regenerate them.

## Deployment verification

After each deployment, verify the homepage and core routes, `robots.txt`, and `sitemap.xml`. Check mobile navigation at 390 px, keyboard Escape handling, Amazon CTA tracking, consent controls, and the contact form before sending paid traffic.
