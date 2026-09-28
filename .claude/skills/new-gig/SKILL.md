---
name: new-gig
description: Scaffold a new gig (concert) post for adrianparker.com with correct front matter, dated filename, and the gig metadata fields, defaulting from the matching content/GigTracker/gig-history.md row when one exists. Use when Adrian asks to write up a concert, show, or gig he went to.
---

# New gig post

A gig is a specialised post covering a concert. It lives in `content/posts/gigs/` and uses `gig-layout.njk`, which renders a metadata card — with a "Setlist" chip next to any performer who has a setlist.fm id, opening a modal with the setlist image — and a photo slideshow when the gig has a published photo set.

Most gigs already have a row in `content/GigTracker/gig-history.md` (Adrian's hand-maintained gig log). When one exists, `npm run new-gig` scaffolds the post from it — venue, city, country, performers, and any setlist.fm ids are already there, so there's much less to ask for.

## 1. Find the gig-history row

Ask Adrian for the headline artist, then run:

```bash
npm run new-gig -- <artist>
```

This lists every matching row (date, show, venue, city, and whether a review already exists). If there's more than one match, ask Adrian which one (by date) — one question at a time.

If nothing matches, there's no gig-history row yet — skip to "4. Fallback: no gig-history row" below.

## 2. Fill in what the row doesn't have

The row gives headline artist, support artists, venue, city, country, date, and setlist.fm ids for free. Still ask, one at a time:

- **Summary** — a one-line summary for the front matter and index page. If the row's Notes column has text, offer it as a starting point (`npm run new-gig -- <artist>` doesn't show Notes, but `content/GigTracker/gig-history.md` does — check the row directly). If there's no Notes text either, offer a sensible fallback and let Adrian confirm or replace it.
- **Photos** — a folder of photos from the gig, if there is one.

## 3. Write the stub

```bash
npm run new-gig -- <artist> <YYYY-MM-DD> --summary '...'
```

The stem (`YYYYMMDD-Artist-Venue-City`) is derived automatically and printed after the file is written — you'll need it for photos and for the branch/commit in step 6.

If Adrian has photos, publish them first using that stem, then write the stub with `--photos`:

```bash
npm run photos -- <stem> <folder> --upload   # needs the blog-photos AWS profile
npm run new-gig -- <artist> <YYYY-MM-DD> --summary '...' --photos
```

`npm run new-gig` refuses to overwrite an existing file, refuses if a gig post already exists for that date, and (with `--photos`) refuses if no photo manifest exists yet for the stem.

The stub's body is two placeholder paragraphs around an `<!-- excerpt -->` marker — Adrian writes the actual review on top of it.

## 4. Fallback: no gig-history row

Ask one question at a time, waiting for Adrian's answer before asking the next.

Required, in order:

- **Headline artist**
- **Venue** and **city** (and **country** — usually `New Zealand`)
- **Date of the gig** — this is the `date` field and drives the filename

Optional — ask each one individually, but don't block on them:

- **Support artists** — a list
- **Setlist.fm id(s)** — the hex id from the end of each performer's setlist.fm URL (e.g. `.../wiltern-theatre-los-angeles-ca-34b29cb.html` → `34b29cb`)
- **Photos** — a folder of photos from the gig. If there is one, publish it as a set named after the gig file stem (`npm run photos -- <stem> <folder> --upload`, see README → Photos) and set `photos: '<stem>'`.

Filename: `content/posts/gigs/YYYYMMDD-Artist-Venue-City.md`, using the gig date. The convention is loose after the date — artist alone is fine when it's unambiguous.

```yaml
---
title: 'Artist @ Venue, City'
navtitle: 'YYYY Artist'
summary: 'One line summary'
metadesc: 'Concert review of Artist at Venue, City, D Month YYYY.'
date: YYYY-MM-DD
readingtime: 'N minutes'
headlineArtist: 'Artist'
supportArtists: ['Support One']
venue: 'Venue'
city: 'City'
country: 'New Zealand'
setlistfm: ''
photos: ''
---

Opening paragraph.

<!-- excerpt -->

Rest of the review.
```

`layout: gig-layout.njk` and `tags: ['gig']` are not needed in the file — `content/posts/gigs/gigs.11tydata.json` sets both for the whole directory.

Conventions:

- `title` — always `Artist @ Venue, City`.
- `navtitle` — always `<year> <Artist>`, e.g. `2026 Teen Jesus`. Shorten long artist names; this appears in a 170px sidebar.
- `metadesc` — always `Concert review of <Artist> at <Venue>, <City>, <D Month YYYY>.`
- `setlistfm` — one `Performer Name:id` pair per performer with a setlist, comma-separated (`\,` escapes a literal comma in a name, an optional `:empty` suffix suppresses that performer's chip) — the exact same format as the `Setlist.fm ID` column in `content/GigTracker/gig-history.md`. The performer name must match `headlineArtist` or the relevant `supportArtists` entry exactly, or its chip won't render.
- **Omit optional keys entirely rather than leaving them as empty strings.** The layout guards each with `{% if %}`, and an empty string is truthy enough to render a broken link.
- `readingtime` — word count ÷ 200, rounded up. Most gig write-ups are `'1 minute'`.

## 5. Verify

```bash
npm run build
```

Check `_site/posts/gigs/<stem>/index.html` — confirm the metadata card renders, that a "Setlist" chip appears next to any performer with an id, and that the slideshow appears (one `figure.slideshow-slide` per photo) if photos were set. An unknown set name fails the build. Then confirm it shows on `_site/gigs/index.html` and the home page.

If the gig had a gig-history row, also check `_site/Gig-History/index.html`'s embedded gig data — that row's date should now resolve to a `reviewUrl` of `/posts/gigs/<stem>/` (the "Read the review" link).

## 6. Ship it

Don't commit to `master` — branch and open a PR, per CLAUDE.md:

```bash
git checkout -b gig/<stem>
git add content/posts/gigs/<stem>.md content/_data/photoSets/<stem>.json   # the manifest only if photos were published
git commit -m "Add gig review stub for <Artist> @ <Venue>, <City>"
git push -u origin gig/<stem>
gh pr create --draft --title "..." --body "..."
```

Open it as a **draft** PR — Adrian writes the actual review on the branch before it's ready. No AI attribution in the commit message or PR body. Never push to `master`, never merge.
