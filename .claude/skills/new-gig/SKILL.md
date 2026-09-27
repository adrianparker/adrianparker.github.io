---
name: new-gig
description: Scaffold a new gig (concert) post for adrianparker.com with correct front matter, dated filename, and the gig metadata fields. Use when Adrian asks to write up a concert, show, or gig he went to.
---

# New gig post

A gig is a specialised post covering a concert. It lives in `content/posts/gigs/` and uses `gig-layout.njk`, which renders a metadata card — with a "Setlist" chip next to any performer who has a setlist.fm id, opening a modal with the setlist image — and a photo slideshow when the gig has a published photo set.

There is a blank template at `content/posts/gigs/template.hmmm` (gitignored, so it never builds).

## 1. Gather

Ask one question at a time, waiting for Adrian's answer before asking the next. Don't bundle multiple fields into a single message.

Required, in order:

- **Headline artist**
- **Venue** and **city** (and **country** — usually `New Zealand`)
- **Date of the gig** — this is the `date` field and drives the filename

Optional — ask each one individually, but don't block on them:

- **Support artists** — a list
- **Setlist.fm id(s)** — the hex id from the end of each performer's setlist.fm URL (e.g. `.../wiltern-theatre-los-angeles-ca-34b29cb.html` → `34b29cb`); cross-check `content/GigTracker/gig-history.md`'s `Setlist.fm ID` column for the same date, since the two should agree
- **Photos** — a folder of photos from the gig. If there is one, publish it as a set named after the gig file stem (`npm run photos -- <stem> <folder> --upload`, see README → Photos) and set `photos: '<stem>'`. The layout renders the set as a slideshow.

## 2. Filename

`content/posts/gigs/YYYYMMDD-Artist-Venue-City.md`, using the gig date.

Examples in the repo: `20260523-Teen-Jesus-and-the-Jean-Teasers.md`, `20090218-Datsuns-Astoria-London.md`. The convention is loose after the date — artist alone is fine when it's unambiguous.

## 3. Write the file

```yaml
---
layout: gig-layout.njk
title: 'Artist @ Venue, City'
navtitle: 'YYYY Artist'
summary: 'One line summary'
metadesc: 'Concert review of Artist at Venue, City, D Month YYYY.'
date: YYYY-MM-DD
readingtime: 'N minutes'
tags: ['gig']
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

Conventions:

- `title` — always `Artist @ Venue, City`.
- `navtitle` — always `<year> <Artist>`, e.g. `2026 Teen Jesus`. Shorten long artist names; this appears in a 170px sidebar.
- `metadesc` — always `Concert review of <Artist> at <Venue>, <City>, <D Month YYYY>.`
- `setlistfm` — one `Performer Name:id` pair per performer with a setlist, comma-separated (`\,` escapes a literal comma in a name, an optional `:empty` suffix suppresses that performer's chip) — the exact same format as the `Setlist.fm ID` column in `content/GigTracker/gig-history.md`. The performer name must match `headlineArtist` or the relevant `supportArtists` entry exactly, or its chip won't render.
- **Omit optional keys entirely rather than leaving them as empty strings.** The layout guards each with `{% if %}`, and an empty string is truthy enough to render a broken link.
- `readingtime` — word count ÷ 200, rounded up. Most gig write-ups are `'1 minute'`.

## 4. Verify

```bash
npm run build
```

Check `_site/posts/gigs/<Slug>/index.html` — confirm the metadata card renders, that a "Setlist" chip appears next to any performer with an id, and that the slideshow appears (one `figure.slideshow-slide` per photo) if you set `photos`. An unknown set name fails the build. Then confirm it shows on `_site/gigs/index.html` and the home page.

## Notes

- Don't commit to `master` — branch and open a PR, per CLAUDE.md.
