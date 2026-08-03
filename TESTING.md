# Testing Guide

How to run, maintain and troubleshoot the tests for adrianparker.github.io.

## The three suites

| Suite | What it covers | Speed | Runs in CI |
|---|---|---|---|
| **Unit** (`tests/unit/*.test.mjs`) | Everything in `lib/` — collections, filters, shortcodes | ~60ms | yes |
| **Smoke** (`tests/smoke.test.js`) | The build produced the right pages, with the right structure | ~60ms | yes |
| **Theme** (`tests/theme.test.js`) | Light/dark toggle behaviour, persistence, no-JS fallback | ~35s | no, local only |
| **Visual regression** (`tests/visual-regression.test.js`) | Rendered appearance, against committed baseline screenshots | ~55s | no, local only |

Mocha for running, Chai for assertions, c8 for coverage, cheerio for DOM
assertions, Playwright + pixelmatch for screenshots.

## Commands

```bash
npm run test:unit      # unit tests + coverage gate. No build, no browser
npm run test:smoke     # build + smoke tests
npm run test:theme     # build + light/dark theme behaviour
npm run test:visual    # build + visual regression
npm test               # everything
npm run test:headless  # build + smoke only — what the deploy workflow runs
```

The theme suite serves on port 3001 and visual regression on 3000, so both
can run in the same mocha process under `npm test`.

Run `npm run test:unit` constantly — it is effectively instant. Run the
visual suite before anything touching CSS or templates.

First-time setup for the visual suite:

```bash
npx playwright install chromium
```

## Coverage

Coverage applies to `lib/` only, and the floor in `.c8rc.json` is **100%** on
statements, branches, functions and lines.

That is a description of where the code actually is, not an aspiration.
`lib/` is three modules of pure functions with tests written alongside them.
A lower floor would permit a regression from the current state.

**No PR may lower it.** If something in `lib/` becomes genuinely unreachable,
mark it:

```js
/* c8 ignore next 3 -- unreachable: Eleventy guarantees a Date here */
```

Templates and CSS are not unit-testable. Smoke and visual regression cover
those.

## Visual regression

### How it works

Pages are listed once in `tests/config.js` under `testPages`, and the suite
crosses them with every viewport in `viewports`. Adding a page means adding
one line; you do not touch the test file.

Baselines live in `tests/screenshots/` and are committed. Actual captures go
to `tests/screenshots-actual/`, which is gitignored, along with `diff-*.png`
images for anything that differed.

### Themes

Every page is captured in **dark**. Only the pages in `lightThemePages`
(currently the home page and a gig post) are also captured in **light**.

That is deliberate rather than lazy. Layout regressions look identical in
either theme, so a second full set would mostly duplicate the first; colour
bugs that survive a theme switch — a hardcoded value, an icon that cannot be
recoloured — are asserted directly in `tests/theme.test.js`. And 16 baselines
were already 11MB, with every refresh adding that again to git history.

The two chosen pages between them cover entry listings, the gig metadata card
and its hairlines, external links, images and the footer.

Baseline filenames carry the theme: `home-page-desktop-dark.png`.

### Thresholds

`maxDiffRatio` in `tests/config.js` is **0.1%** of pixels, uniformly.

Previously most pages allowed 5% while two video-post assertions demanded
exactly 0. 5% is loose enough that an entire sidebar column could change
without failing.

### Determinism

Four things make the capture repeatable, all in
`tests/utils/screenshot-utils.js`. Each was added in response to a specific
observed flake, not speculatively:

1. **Lazy images are forced eager, then awaited via `decode()`.** The image
   shortcode emits `loading="lazy"`, and these are `fullPage` captures, so
   whether a below-the-fold image had decoded when the capture fired was pure
   timing. This produced a bimodal 336,420-pixel difference on the video post
   in roughly half of all runs. `complete` did not catch it — a deferred lazy
   image has not requested its fetch yet, and `complete` only means bytes
   arrived, not that the frame is paintable.
2. **Every image must report `complete`.** Without this a gig post compared
   clean alone but differed by ~5,000 pixels inside a full run, because its
   Flickr thumbnail had not arrived.
3. **Third-party scripts are blocked.** Dropped is remote JavaScript that
   rewrites the DOM after load — specifically the Flickr embed script, which
   enhances gig markup client-side and had not reliably finished by capture
   time.
4. **Third-party media is blocked.** The video post embeds a remote MP4 with
   `preload="metadata"`, whose load state is not deterministic. Costs nothing
   in layout terms: `.video-wrapper` has a fixed 16/9 aspect-ratio box, so the
   element occupies identical space either way.

Stylesheets, fonts and images still load, so captures stay faithful to what a
reader sees.

If you are chasing a flaky page, **locate the diff band before theorising**.
Reading the y-range out of the diff PNG identified the lazy-image bug in one
step, after two plausible-but-wrong hypotheses (the remote video, then a
third-party widget image) had already been chased and eliminated. A 600px-tall
band matching a generated 800x600 photo is a much stronger signal than any
amount of reasoning about what *might* be racing.

### Known: the mobile viewport captures a bug

The mobile viewport is 768px, which is exactly where Pure.css's `-md-` grid
tier (`min-width: 48em`) collides with the site's own `max-width: 768px`
query. Both apply, and the page renders in a state neither is designed for.

The mobile baselines therefore record that broken layout. Issue #18 owns both
the CSS fix and moving this viewport below the breakpoint.

## Updating baselines

There is an `update-baselines` skill that walks through this.

**First, decide whether you should.** A failing visual test is not
automatically a stale baseline:

- You changed CSS or layout deliberately → regenerating is correct.
- You changed a dependency, refactored, or touched config → this is a
  **regression**. Investigate. Do not regenerate.

Look at the diff image in `tests/screenshots-actual/diff-*.png` and confirm
the change is what you intended across the whole page.

```bash
npm run test:visual
```

Then copy actuals over baselines, **excluding the diff images**:

```bash
for f in tests/screenshots-actual/*.png; do
  case "$(basename "$f")" in diff-*) continue ;; esac
  cp "$f" tests/screenshots/
done
```

> Do **not** use `cp tests/screenshots-actual/*.png tests/screenshots/`. That
> is what this document used to say, and it swept `diff-*.png` into the
> committed baseline directory — 8.5MB of them accumulated there before it was
> caught.

Check what changed, then commit baselines **separately** from the change that
caused them, so the PR stays reviewable:

```bash
git status --short tests/screenshots/
```

### A Playwright bump invalidates every baseline

Playwright pins a Chromium build. A new Playwright means a new Chromium,
which rasterises text slightly differently — measured at 0.02–0.25% per page
on the 1.59 → 1.62 bump, scaling with how much text a page carries. Index
pages shifted most; sparse pages least. Enough to cross the 0.1% threshold on
six of the twelve baselines.

So a Playwright upgrade is always a two-part change: the bump, then a full
baseline refresh in a separate commit.

**This will not be caught by CI**, because visual regression only runs
locally (#44). A Dependabot Playwright bump goes green through the PR check
and then breaks every local visual run. Treat those PRs as needing a manual
baseline pass before merge.

Also note `npx playwright install` **prunes browser builds the installed
version does not use**. Installing browsers for a newer Playwright and then
reverting the package leaves you with no usable browser and a confusing
"Executable doesn't exist" error. Re-run `npx playwright install chromium`
after any Playwright version change in either direction.

### After an image-pipeline change, delete `_site` first

`@11ty/eleventy-img` skips regenerating images that already exist in the
output directory. After changing anything in the image pipeline, a plain
rebuild leaves the old files in place and the visual suite passes
misleadingly.

This actually happened during the Eleventy 3 upgrade: two runs passed before
`rm -rf _site` revealed a deterministic 834,337-pixel difference from sharp
re-encoding.

```bash
rm -rf _site && npm run test:visual
```

## Understanding failures

**`No baseline for <page> @ <viewport>`** — the page is new, or its baseline
was deleted. Generate and commit baselines. Note this *fails*; it used to
skip, which meant a deleted baseline silently passed.

**`image dimensions differ — baseline WxH, actual WxH`** — the page changed
height or width. Almost always real: added content, or a layout change.

**`N pixels differ (X%), over the 0.1000% threshold`** — appearance changed.
Check the diff image.

**Smoke failures** are structural — a missing element, a shortcode that did
not render, a link pointing somewhere unexpected. They assert on parsed DOM,
so they describe what is actually wrong rather than which substring vanished.

## Adding tests

**A new page under visual regression:** add one line to `testPages` in
`tests/config.js`, run the suite (it will fail with "No baseline"), then
generate and commit baselines.

**New code in `lib/`:** it needs unit tests in `tests/unit/`, and the coverage
gate will fail the build if you skip them. That is the point.

## Troubleshooting

**Port already in use** — the visual suite serves on 3000, `npm run serve`
uses 8080. Kill whatever is holding the port.

**Playwright browser not found**

```bash
npx playwright install chromium
```

**Screenshots differ on another machine** — font rendering differs across
operating systems. Baselines are macOS-generated. This is why visual
regression is not in CI; see #44.
