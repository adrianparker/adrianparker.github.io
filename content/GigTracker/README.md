# Gig Tracker — source file contract

`gig-history.html` and `gig-history.css` in this directory are **written by the
Gig Tracker agent, not by hand**. adrianparker.com rebuilds the page at
`/GigTracker/` from them on every build, so whatever the two files say at build
time is what gets published. Overwrite them freely; nothing here edits them
back.

`index.njk` is the site's own wrapper and is **not** agent-owned — don't write
to it.

## How the embed works

`content/_data/gigTrackerApp.mjs` reads both files at build time and hands them
to `lib/embed-app.mjs`, which:

1. takes the contents of `<body>` and throws the `<head>` away
2. moves the reload controls into a hidden container (see below)
3. gives every `<button>` an explicit `type="button"`, which the site's HTML
   validation requires — you don't need to write it, but it's harmless if you do
4. drops the `:root`, `html` and `body` rules from the CSS
5. prefixes every remaining selector with `.gig-tracker`
6. re-declares the app's custom properties in terms of the site's theme tokens
7. inlines the result into the page

Neither source file is served. There is no `/GigTracker/gig-history.html`.

## Rules to follow

**Keep it a standalone document.** A full `<!DOCTYPE html>` page that opens and
works on its own, with everything the app needs inside `<body>`. The `<head>` is
discarded — a `<title>`, a `<link>` to `gig-history.css`, a `<meta>` are all
fine to have, they just don't come along.

**Colour only through custom properties.** Declare them in `:root` in
`gig-history.css` and use `var(--name)` everywhere else. A literal `#1c2029` or
`rgba(...)` outside `:root` cannot follow the light/dark toggle — it renders,
but stays one colour in both themes. The build prints a warning naming each one
and a test fails, so these get caught, but it's better not to write them.

The properties currently mapped to site tokens:

| Property | Used for |
|---|---|
| `--bg` | page background |
| `--panel` | panel and table background |
| `--border` | rules and borders |
| `--text` | body text |
| `--muted` | secondary text |
| `--accent` | links, highlights |
| `--row-alt` | alternating row tint |
| `--row-hover` | row hover |

Adding a new property is fine — say so and it gets a token. An unmapped one
just keeps whatever `:root` gives it, which won't theme.

**Don't style `body` or `html`.** Those rules are dropped, because on the site
the app is one section of a page rather than the whole document. Page-level
padding, background and font belong to the site. Put anything you need on your
own wrapper element instead.

**Don't set `font-family`.** The site's fonts apply. Sizes, weights and spacing
are yours.

**Don't fetch sibling files at runtime.** `fetch("gig-history.md")` works when
the app is opened from a folder but not on the site, where that file isn't
published. The gig data has to be baked into the HTML — the current
`let GIGS = [...]` approach is right. The Reload button and its file picker are
kept for local use but moved into a hidden container on the site, so their
elements still exist for `getElementById` and simply can't be seen or clicked.

**Give one `<h1>`.** It becomes the page's heading, and the site adds none of
its own. More than one fails a test.

**Look up elements defensively where you can.** Top-level
`document.getElementById("x").addEventListener(...)` throws and kills the rest
of the script if `x` ever goes away.

## Known nits worth fixing

- The Date column wraps to two lines (`2026-` / `06-27`) at desktop width,
  because the site page is narrower than a full browser window. A
  `white-space: nowrap` on the date cell would fix it.
- Mobile is not handled yet — deliberately out of scope for now.

## Checking your work

From the repo root:

```bash
npm run test:smoke
```

The `Smoke Tests - Apps` section asserts the embed contract directly: the app
renders, the data is inlined, the reload controls are unreachable, every
selector is scoped, and no literal colour survives.
