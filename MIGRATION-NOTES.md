# BUILT website — six-page build, migration notes

Built from: the live site (built-gareth-mackenzie.garethmackenzie.workers.dev) plus the
GarethMackenzie/built-author-website GitHub repo as a structural baseline. The repo was a step
behind live (older About copy, title, meta description, robots tag, nav), so live copy was used
wherever the two disagreed. No push with a newer build had landed in the repo at the time this
was built — see the open items below before replacing anything currently deployed.

## What to do with this folder
Drop these files into the root of wherever the site is served from (same convention as now:
`/built/index.html` answers `/built/`, etc.). `robots.txt` is not included here — leave the
current one exactly as is, nothing in this work required changing it.

## Open items (need your input, not guesses)
1. **Author photo**: `assets/gareth-mackenzie-author.jpeg` is deliberately NOT included. The
   live site's alt text describes a black-and-white portrait, but the only file in the repo is
   an older bookstore photo. The current live file wasn't accessible to fetch. Copy your actual
   current photo into `assets/gareth-mackenzie-author.jpeg` before deploying, or the About and
   Media pages will show a broken image.
2. **Social share image**: live HTML pointed to `assets/social-card.jpg`, but only
   `social-card.png` exists anywhere I could find. Every page here references the `.png`
   consistently. If a real `.jpg` exists in your current build, swap it in and update the
   `og:image` / `twitter:image` tags across all 8 HTML files, or just keep the `.png`.
3. **Worker routing**: if the site is served by a Cloudflare Worker with hand-written routing
   (rather than static-assets serving), the new folders need matching routes added so `/built/`
   etc. actually resolve to `/built/index.html`. Static-assets serving handles this
   automatically; a custom `fetch` handler will not.
4. **Contact form backend**: intentionally not wired up. No real inbox is confirmed connected.
   The form is fully built and styled but honestly tells the visitor it isn't active yet, and
   points them to LinkedIn instead. Connect it to a real service when ready and remove the
   `data-contact-form` intercept in `script.js`.
5. **Merge against your Codex build**: if that build has moved further than what's reflected
   here (new sections, further copy refinement), treat this as a strong first draft to diff
   against, not a blind replacement.

## Technical notes
- Absolute paths (`/styles.css`, `/assets/...`) are used everywhere instead of relative ones.
  With real nested routes (`/built/index.html`, `/about/index.html`, etc.) relative paths
  resolve differently depending on folder depth, which breaks the moment there's more than one
  directory level. Absolute paths work correctly both on the current Workers deployment and on
  a GitHub Pages user/org page (`garethmackenzie.github.io/`), since both serve from the root.
  They would need adjusting if this ever moved to a GitHub *project* page
  (`garethmackenzie.github.io/reponame/`).
- `styles.css`, `theme.css`, `cover.css`, and `script.js` are untouched from the existing repo,
  aside from one small addition at the end of `script.js` for the contact form's honest
  not-connected message. A new `pages.css` loads after the existing three stylesheets and adds
  only new selectors, so nothing already live is overridden.
- `styles.css` still carries some unused rules from earlier design iterations (a CSS-drawn book
  mockup, an unused reviews grid, an unused avatar placeholder). Left alone for this pass since
  removing them isn't required for anything to work and touching more of that file than
  necessary adds risk. Worth a cleanup pass later.
