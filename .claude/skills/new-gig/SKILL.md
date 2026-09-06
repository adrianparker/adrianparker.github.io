---
name: new-gig
description: Scaffold a new gig (concert) post for adrianparker.com with correct front matter, dated filename, and the gig metadata fields. Use when Adrian asks to write up a concert, show, or gig he went to.
---

# New gig post

A gig is a specialised post covering a concert. It lives in `content/posts/gigs/` and uses `gig-layout.njk`, which renders a metadata card plus optional setlist.fm, Spotify and Flickr links.

There is a blank template at `content/posts/gigs/template.hmmm` (gitignored, so it never builds).

## 1. Gather

Ask one question at a time, waiting for Adrian's answer before asking the next. Don't bundle multiple fields into a single message.

Required, in order:

- **Headline artist**
- **Venue** and **city** (and **country** — usually `New Zealand`)
- **Date of the gig** — this is the `date` field and drives the filename

Optional — ask each one individually, but don't block on them:

- **Support artists** — a list
- **setlist.fm URL**
- **Spotify playlist** — must be the `/embed/playlist/...` form, not a normal share link
- **Flickr album URL** plus a **thumbnail URL** (`https://live.staticflickr.com/...`). Both are needed for the embed; one without the other won't render.

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
spotify: ''
flickr: ''
flickrThumbnail: ''
---

Opening paragraph.

<!-- excerpt -->

Rest of the review.
```

Conventions:

- `title` — always `Artist @ Venue, City`.
- `navtitle` — always `<year> <Artist>`, e.g. `2026 Teen Jesus`. Shorten long artist names; this appears in a 170px sidebar.
- `metadesc` — always `Concert review of <Artist> at <Venue>, <City>, <D Month YYYY>.`
- **Omit optional keys entirely rather than leaving them as empty strings.** The layout guards each with `{% if %}`, and an empty string is truthy enough to render a broken link.
- `readingtime` — word count ÷ 200, rounded up. Most gig write-ups are `'1 minute'`.

## 4. Verify

```bash
npm run build
```

Check `_site/posts/gigs/<Slug>/index.html` — confirm the metadata card renders, that any setlist.fm and Spotify links are present, and that the Flickr embed appears if you set both Flickr fields. Then confirm it shows on `_site/gigs/index.html` and the home page.

## Notes

- Don't commit to `master` — branch and open a PR, per CLAUDE.md.
