# Gig Tracker — source file contract

Three files in this directory feed the Gig Tracker page, each with a
different owner:

- **`gig-history.md`** — the gig data, one row per gig. **Edited by hand by
  Adrian.** This is the file to update to add a gig; nothing else in this
  directory needs to change for that.
- **`gig-history.html`** / **`gig-history.css`** — the app shell (filters,
  table, sort/search JS, styling). **Written by the Gig Tracker agent, not by
  hand**, and only touched when the UI itself changes. Their embedded `let
  GIGS = [...]` line is a placeholder — it is overwritten at every build with
  data parsed fresh from `gig-history.md`, so it does not need to be kept in
  sync.

adrianparker.com rebuilds the page at `/GigTracker/` from all three on every
build, so whatever they say at build time is what gets published.

`index.njk` is the site's own wrapper and is **not** agent-owned — don't write
to it.

## The data file format

`gig-history.md` is a markdown table with a header row and separator row,
followed by one data row per gig, most recent first:

```
| Date | Show | Category | City | Country | Venue | Notes | Association | Setlist.fm ID |
|---|---|---|---|---|---|---|---|---|
| 2026-06-27 | Hadestown: Teen Edition | Theatre | Paraparaumu | New Zealand | Coastlands Theatre | | | |
```

All nine columns are required on every row (leave a column blank rather than
omitting it — see the `Notes`, `Association` and `Setlist.fm ID` columns
above). Free text before the header (a title, a description paragraph) and
after the table (notes) is ignored by the parser in `lib/gig-history.mjs`;
only lines starting with `|` after the header count as rows, and a row with
the wrong number of columns is skipped.

`Setlist.fm ID` is data only — the setlist.fm ID for the gig, where one
exists. It is parsed into each gig object as `setlistfmId` but the app
deliberately never reads that field: it has no `<th>`, isn't part of the
`applyFilters`/search key lists, and isn't rendered in any row. Leave it
blank for gigs that don't have one; adding a value never changes anything a
visitor sees.

## How the embed works

`content/_data/gigTrackerApp.mjs`:

1. parses `gig-history.md` via `lib/gig-history.mjs` and splices the result
   into `gig-history.html`'s `let GIGS = [...]` line
2. hands the result, plus `gig-history.css`, to `lib/embed-app.mjs`, which:
   1. takes the contents of `<body>` and throws the `<head>` away
   2. moves the reload controls into a hidden container (see below)
   3. gives every `<button>` an explicit `type="button"`, which the site's
      HTML validation requires — you don't need to write it, but it's
      harmless if you do
   4. drops the `:root`, `html` and `body` rules from the CSS
   5. prefixes every remaining selector with `.gig-tracker`
   6. re-declares the app's custom properties in terms of the site's theme
      tokens
   7. inlines the result into the page

None of the three source files is served. There is no
`/GigTracker/gig-history.html` or `/GigTracker/gig-history.md`.

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
