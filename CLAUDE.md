# CLAUDE.md

Guidance for Claude Code working in this repo.

---

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

Gigs are a specialised post: a concert, usually with a setlist.fm link, sometimes a Spotify playlist and a Flickr album.

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
```

Run `npm run test:unit` constantly; it takes well under a second. Run the
visual suite before anything touching CSS or templates.

---

## Hard rules

- **Never edit anything in `_site/`.** It is build output and is regenerated on every build. Edit the source instead.
- **The stylesheet is `static/index.css`**, not `_site/index.css`. There is exactly one stylesheet for the whole blog.
- `static/` is passthrough-copied to the site root, so `static/foo.css` is served at `/foo.css`.
- `img/` is *not* passthrough-copied — those are source-resolution photos consumed by the `image` shortcode, which writes resized output to `_site/img/`.
- The build input directory is `content/`, set via `dir.input` in the config.
- **The Eleventy config is `eleventy.config.mjs` and is ESM** (`import`/`export`). The rest of the project — including the whole test suite — is CommonJS (`require`). `package.json` has no `"type": "module"`, which is what keeps those two coexisting. If you add a new `.js` file it will be CommonJS; use `.mjs` if you need ESM.
- Node 22+ is required (`@11ty/eleventy-img` v7). See `.nvmrc`.

---

## Deploy

Merging to `master` triggers `.github/workflows/build.yml`, which builds, runs smoke tests, and publishes `_site/` to GitHub Pages via `peaceiris/actions-gh-pages`. Live within about two minutes.

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
flickr: 'https://www.flickr.com/photos/adrianparker/albums/...'
flickrThumbnail: 'https://live.staticflickr.com/...'
---
```

`navtitle` convention for gigs is `'<year> <Artist>'`. Everything from `supportArtists` down is optional — the layout guards each with `{% if %}`.

### Shortcodes

```njk
{% image "img/source-photo.jpg", "Alt text, also used as the visible figcaption" %}
{% video "/video/clip.mp4" %}
```

`image` generates webp + jpeg at 400px and 800px. Note the alt text is *also* rendered as the `<figcaption>`, so write it to work as a visible caption.

---

## Testing

Mocha + Chai, with Playwright + pixelmatch for visual regression.

- `tests/smoke.test.js` — build validation, runs in CI.
- `tests/theme.test.js` — light/dark toggle behaviour. Local only; serves on port 3001.
- `tests/analytics.test.js` — PostHog config and custom events. Local only; serves on port 3002.
- `tests/visual-regression.test.js` — screenshots at 1200px (desktop) and 390px (mobile), compared against baselines in `tests/screenshots/`. Local only; serves on port 3000.

**Theming:** colours come from tokens in `:root` declared twice — a plain dark value first, then a `light-dark()` override. Browsers without `light-dark()` keep the dark theme. The toggle sets `data-theme` on `<html>`; an inline script in `partials/head.njk` must stay ahead of the stylesheet or the page flashes the wrong theme on load.

See `TESTING.md` for detail, and the `update-baselines` skill for the baseline refresh procedure.

**On baselines:** a visual diff after a deliberate CSS change is expected. Regenerate baselines in a **separate commit** from the change itself so the diff stays reviewable. A visual diff after a change that should have been invisible (a dependency upgrade, a refactor) is a regression — investigate, do not paper over it by regenerating.

---

## Roadmap

Work is tracked in GitHub Issues, organised into milestones by phase. Reference issues as `#N` in commit messages.

The full roadmap and rationale lives in the plan file referenced from the Phase 0 PR.
