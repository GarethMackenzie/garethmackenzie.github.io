# Deployment: switching GitHub Pages to GitHub Actions

**Status: prepared, not applied.** Nothing in repository settings has been changed. This document is the pre-flight record and the procedure.

## Why switch

Production currently publishes the repository root straight from the branch. Evidence (HTTP 200 on the live domain): `/tools/site_qa.py`, `/README.md`, `/MIGRATION-NOTES.md`, `/styles.css`. The Production Gate workflow exists and asserts that these must never ship, but it does not control what is live today. After the switch only the gate's allowlisted files are published.

## What the gate does (`.github/workflows/production-gate.yml`)

- Runs only after **Site QA** completes successfully for a `push` or manual run on `main` (not for pull requests or other branches).
- Checks out the exact QA-passed commit and skips if it is no longer the tip of `main`.
- Stages only the runtime files and directories listed in the workflow (`books` is now included) into `_site`, then asserts repository internals (`tools`, `.github`, `README.md`, legacy stylesheets) are absent.
- **New:** `python3 tools/verify_artifact.py _site` fails the run if any required page or asset is missing, any local reference (links, images, `srcset`, preloads, CSS `url()`, canonical and social-image URLs, sitemap entries) does not resolve inside the artifact, or any internal file ships.
- Uploads the artifact and deploys it with `actions/deploy-pages`. Actions are pinned to commit SHAs.
- Permissions: `contents: read`, `pages: write`, `id-token: write`. Serialised by the `github-pages-production` concurrency group (no cancel mid-deploy).

## Verified before asking for approval

Staging with the gate's own file lists on the release candidate produced **56 files, 2,919 KB, 641 local references checked, verification passed**. The verifier was also run against a deliberately broken copy and reported the missing `/books/` page, the missing homepage social image and the shipped `tools/` directory.

**Not verified (GitHub settings could not be read; the API was rate limited):** the Pages source and custom-domain settings, the `github-pages` environment's deployment-branch rule, and branch protection on `main`. Check them yourself (below) before approving.

## Settings to check (read-only, Settings tab of the repository)

1. **Pages**: note the current source ("Deploy from a branch", branch and folder), the custom domain `mackenziebooks.bbroot.com` and "Enforce HTTPS".
2. **Environments > github-pages**: Deployment branches should be limited to `main` only. Add that rule if it allows all branches.
3. **Branches**: protect `main` (require a pull request and the "Site QA" check). Recommended; the gate only deploys what Site QA passed on `main`.

## Procedure (after you approve; do not start before)

1. Create a rollback marker: tag the current `main` commit as `pre-redesign`.
2. Settings > Pages > Source: change to **GitHub Actions**. The live site keeps serving the last published content until a workflow deploys (expected behaviour; confirm on the Pages settings screen after the change).
3. Merge the reviewed pull request into `main`. This triggers Site QA and then the gate.
4. Watch Actions: Site QA, then Production Gate (stage, verify artifact, deploy). Expect about 6 to 8 minutes.
5. Verify live: `/` `/books/` `/built/` `/insights/` return 200; `/dist/site.css` and `/assets/fonts/newsreader-latin-opsz-normal.woff2` return 200; `/tools/site_qa.py`, `/README.md`, `/styles.css` return 404; the custom domain still serves over HTTPS.
6. Complete `manual-testing.md` and the contact form test in `contact-form.md`.

Order matters: switch the source **before** merging. If the merge happens while the source is still "branch", the merge publishes immediately and the gate's deploy step will fail.

## Rollback

| Speed | Action | Result |
|---|---|---|
| Immediate (minutes) | Settings > Pages > Source back to "Deploy from a branch", `main`, `/ (root)` | Branch publishing resumes from the current `main`. If `main` itself is bad, also do the next row. |
| About 8 minutes | `git revert` the merge commit on `main` through a pull request | Site QA passes, the gate deploys the previous state. |
| Redeploy same commit | Actions > Site QA > Run workflow on `main` | Triggers the gate for the current tip. The gate has no manual trigger of its own. |

The `pre-redesign` tag marks the last pre-release commit for reference.

## Known limits

- Static hosting on GitHub Pages serves `Cache-Control: max-age=600`; returning visitors revalidate assets after ten minutes (304 responses, about 30 ms measured). A CDN in front would be needed for longer caching.
- With an Actions deployment the repository's `CNAME` file is not used; the custom domain comes from the Pages setting. Confirm the domain still resolves after the switch.
