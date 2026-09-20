# CLAUDE.md

Guidance for Claude Code working in this repo.

---

## Adopt specific coding standards in linked CLAUDE-code.md file

First read .\CLAUDE-code.md and adopt all instructions therein.

## Working agreement — read first

**Never push to `master`.** All work goes on a branch and up as a pull request. Adrian reviews and merges manually.

- Branch, commit, push the branch, open a PR. Stop there.
- Merging is Adrian's call, always.
- A push to `master` publishes to production immediately (see Deploy below) — that is why this rule exists.
- This is enforced by a `PreToolUse` hook in `.claude/settings.json`, not just by convention. If the hook blocks you, that is working as intended — do not try to route around it.

This rule is provisional and up for review around **February 2027** (tracked as a GitHub issue in the "Later" milestone).

### Pull request rules

- Every PR must have passing tests.
- New JS needs new unit tests.
- **No PR may lower the coverage percentage.** The floor lives in `.c8rc.json` and is currently **100%** on all four metrics, because `lib/` is small and fully covered. Never lower it to make a build pass.

Coverage is scoped to `lib/` only. Templates and CSS are not unit-testable — smoke and visual regression cover those. If something in `lib/` is genuinely unreachable, use a `/* c8 ignore next */` comment with a reason rather than dropping the threshold.

---

## What this site is

Personal blog of Adrian Parker — [www.adrianparker.com](https://www.adrianparker.com). Static, built with **Eleventy**, hosted on **GitHub Pages**.

Three content types:

| Type | Lives in | URL |
|---|---|---|
| **Posts** | `content/posts/*.md` | `/posts/<Slug>/` |
| **Gigs** | `content/posts/gigs/*.md` | `/posts/gigs/<Slug>/` |
| **Apps** | `content/<AppName>/index.njk` | `/<AppName>/` |

Gigs are a specialised post: a concert, sometimes with setlist.fm links, sometimes Spotify playlist links, sometimes a set of photos shown as a slideshow, etc.

---

## Commands

```bash
npm run build          # eleventy build into _site/
npm run serve          # local dev server, live reload, usually :8080
npm run test:unit      # unit tests + coverage gate. No build, no browser — fast
npm run test:smoke     # build + smoke tests
npm run test:theme     # build + light/dark theme behaviour
npm run test:analytics # build + PostHog config and custom events
npm run test:visual    # build + visual regression (slow, needs Playwright)
npm test               # unit + smoke + theme + analytics + visual, everything
npm run test:headless  # build + smoke only — what the deploy workflow runs
npm run photos -- <set-id> <folder> --upload  # publish a set of photos, see README → Photos
```

Run `npm run test:unit` constantly; it takes well under a second. Run the
visual suite before anything touching CSS or templates.

---

## Hard rules

- **Never edit anything in `_site/`.** It is build output and is regenerated on every build. Edit the source instead.
- **The stylesheet is `static/index.css`**, not `_site/index.css`. There is exactly one stylesheet for the whole blog.
- `static/` is passthrough-copied to the site root, so `static/foo.css` is served at `/foo.css`.
- Photos and video live in an S3 bucket behind CloudFront, not in the repo — see README → Photos. Never add photos to the repo; publish a set with `npm run photos` and reference it.
- The build input directory is `content/`, set via `dir.input` in the config.
- Node 22+ is required (`@11ty/eleventy-img` v7). See `.nvmrc`.

---

## Deploy

Merging to `master` triggers `.github/workflows/build.yml`, which builds, runs smoke tests, and publishes `_site/` to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`. Live within about two minutes.

**There is no staging environment.** Whatever merges is what the public sees.

---

## Content conventions

### Post

File: `content/posts/Kebab-Case-Title.md`

```yaml
---
layout: post-layout.njk
title: 'Full Title As Displayed'
navtitle: 'Short Title For Sidebar'
summary: 'One line shown on the index and at the top of the article'
metadesc: 'A brief description for search engines'
date: 2026-07-19
readingtime: '2 minutes'
tags: ['post']
---
```

Keep the key order above. Body starts with an `##` heading. Place a `<!-- excerpt -->` marker after the first paragraph or two — everything before it becomes the index-page excerpt.

Optional extra tags alongside `post`: `popular` (surfaces it in the sidebar), plus free-form topic tags such as `diving`.

### Gig

File: `content/posts/gigs/YYYYMMDD-Artist-Venue-City.md`. There is a blank template at `content/posts/gigs/template.hmmm` (gitignored, so it never builds).

```yaml
---
layout: gig-layout.njk
title: 'Artist @ Venue, City'
navtitle: '2026 Artist'
summary: 'One line summary'
metadesc: 'Concert review of Artist at Venue, City, D Month YYYY.'
date: 2026-05-23
readingtime: '1 minute'
tags: ['gig']
headlineArtist: 'Artist'
supportArtists: ['Support One']
venue: 'Venue'
city: 'City'
country: 'New Zealand'
setlistfm: 'https://www.setlist.fm/...'
spotify: 'https://open.spotify.com/embed/playlist/...'
photos: '20260523-Artist-Venue-City'
---
```

`navtitle` convention for gigs is `'<year> <Artist>'`. Everything from `supportArtists` down is optional — the layout guards each with `{% if %}`.

`photos` names a set published with `npm run photos` (README → Photos), conventionally the gig's own file stem; the layout renders it as a slideshow after the review.

### Shortcodes

```njk
{% image "Post-File-Stem/IMG_1234", "Alt text, also used as the visible figcaption" %}
{% video "https://d200vq1iaq5hh.cloudfront.net/clip.mp4" %}
```

`image` takes a `<set-id>/<name>` reference to a photo already published with `npm run photos` (README → Photos) and emits webp + jpeg at 400px and 800px from CloudFront. The build fails on an unknown set or name. Note the alt text is *also* rendered as the `<figcaption>`, so write it to work as a visible caption.

```njk
{% slideshow "Gig-File-Stem", "Label for screen readers" %}
```

`slideshow` renders every photo in a published set as a swipeable strip (README → Photos → slideshow). Gigs get one automatically from `photos:` front matter; this is for placing one inside a post body.

### Publishing photos

```bash
npm run photos -- <set-id> <folder> --upload   # resize, write manifest, upload
```

Set id = the post or gig file stem. Writes `content/_data/photoSets/<set-id>.json`, which is committed with the post. Needs the `blog-photos` AWS CLI profile locally; nothing in the repo or CI holds credentials.

---

## Testing

Mocha + Chai, with Playwright + pixelmatch for visual regression.

- `tests/smoke.test.mjs` — build validation, runs in CI.
- `tests/theme.test.mjs` — light/dark toggle behaviour. Local only; serves on port 3001.
- `tests/analytics.test.mjs` — PostHog config and custom events. Local only; serves on port 3002.
- `tests/visual-regression.test.mjs` — screenshots at 1200px (desktop) and 390px (mobile), compared against baselines in `tests/screenshots/`. Local only; serves on port 3000.

**Theming:** colours come from tokens in `:root` declared twice — a plain dark value first, then a `light-dark()` override. Browsers without `light-dark()` keep the dark theme. The toggle sets `data-theme` on `<html>`; an inline script in `partials/head.njk` must stay ahead of the stylesheet or the page flashes the wrong theme on load.

See `TESTING.md` for detail, and the `update-baselines` skill for the baseline refresh procedure.

**On baselines:** a visual diff after a deliberate CSS change is expected. Regenerate baselines in a **separate commit** from the change itself so the diff stays reviewable. A visual diff after a change that should have been invisible (a dependency upgrade, a refactor) is a regression — investigate, do not paper over it by regenerating.

---

## Roadmap

Work is tracked in GitHub Issues, organised into milestones by phase. Reference issues as `#N` in commit messages.

The full roadmap and rationale lives in the plan file referenced from the Phase 0 PR.
