---
name: new-gig
description: Scaffold a new gig (concert) post for adrianparker.com, interview Adrian about each act and the night, research other reviews of the show, then draft the review in his voice. Defaults metadata from the matching content/GigTracker/gig-history.md row when one exists. Use when Adrian asks to write up a concert, show, or gig he went to.
---

# New gig post

A gig is a specialised post covering a concert. It lives in `content/posts/gigs/` and uses `gig-layout.njk`, which renders a metadata card — with a "Setlist" chip next to any performer who has a setlist.fm id, opening a modal with the setlist image — and a photo slideshow when the gig has a published photo set.

The skill's job is not just the stub: after scaffolding, it interviews Adrian about what he remembers, researches other reviews of the show, and drafts the review so it reads like one of his.

Most gigs already have a row in `content/GigTracker/gig-history.md` (Adrian's hand-maintained gig log). When one exists, `npm run new-gig` scaffolds the post from it — venue, city, country, performers, and any setlist.fm ids are already there, so there's much less to ask for.

## 1. Find the gig-history row

Ask Adrian for the headline artist, then run:

```bash
npm run new-gig -- <artist>
```

This lists every matching row (date, show, venue, city, and whether a review already exists). If there's more than one match, ask Adrian which one (by date) — one question at a time.

If nothing matches, there's no gig-history row yet — skip to "6. Fallback: no gig-history row" below, then continue with steps 4 and 5 (interview and draft) once the stub is written.

## 2. Fill in what the row doesn't have

The row gives headline artist, support artists, venue, city, country, date, and setlist.fm ids for free. Ask, one at a time:

- **Photos** — a folder of photos from the gig, if there is one.

Don't ask for the **summary** yet — it is written after the draft (step 5), when there is something to summarise. If the row's Notes column has text, remember it (check `content/GigTracker/gig-history.md` directly; `npm run new-gig` doesn't show Notes) and treat it as the first thing Adrian has told you about the gig.

## 3. Write the stub

```bash
npm run new-gig -- <artist> <YYYY-MM-DD>
```

(`--summary` is optional — leave it off for now; the summary is set in step 5.)

The stem (`YYYYMMDD-Artist-Venue-City`) is derived automatically and printed after the file is written — you'll need it for photos and for the branch/commit in step 8.

If Adrian has photos, publish them first using that stem, then write the stub with `--photos`:

```bash
npm run photos -- <stem> <folder> --upload   # needs the blog-photos AWS profile
npm run new-gig -- <artist> <YYYY-MM-DD> --photos
```

`npm run new-gig` refuses to overwrite an existing file, refuses if a gig post already exists for that date, and (with `--photos`) refuses if no photo manifest exists yet for the stem.

The stub's body is two placeholder paragraphs around an `<!-- excerpt -->` marker. Steps 4–5 replace it with the real review.

## 4. Interview Adrian

Do this after the stub exists and before writing any prose. Follow `CLAUDE-code.md`: **one question at a time**, waiting for each answer. Keep a running list of every point Adrian makes, in his own words — the draft must account for every item on it.

Order of questions:

1. **Each act, in the order they played** — support acts first, headliner last, using the performer names from the row / front matter. For each: "What do you remember about <act>? Anything you want to say — the sound, highlights, songs, banter, what they reminded you of, whether you'd see them again." "Skip" is a fine answer; an act Adrian has nothing to say about gets a one-line mention at most, or none if he says to leave it out. If he arrived late or missed an act, record that — it's worth a line in the post.
2. **Who he was with** — friends, family, a date; anyone he met there.
3. **Why he went / history** — what the band means to him, how many times he's seen them, the last time (offer to check earlier posts with `ls content/posts/gigs`, and link to any previous gig post of his on the same act).
4. **The room and the night** — venue, crowd, sound, weather, merch, tickets, anything memorable or annoying.
5. **Anything else** — "Anything else you want in the post?" (recordings he made, a story, a stray observation.) If he recorded the show, ask for the download URL.

Accept short, messy, half-sentence answers. Don't quiz for polish; the drafting step does that. Don't invent follow-ups to pad the list — one clarifying question only where an answer is genuinely ambiguous.

### Research other reviews

When the interview is done, search the web (WebSearch, then WebFetch on the best hits) for other reviews of **this show**: headline artist + venue + city + date or month/year, and again with just artist + city + year. Only count a result if it is about this specific show (check venue and date). Support-act coverage counts too.

If nothing relevant turns up, say so in one line and carry on.

If reviews are found:

- Use them to **improve Adrian's text** — correct facts (song names, order, band members, set length, who joined on stage), and add context only where it supports something he said.
- Then **prompt Adrian about anything the reviews noticed that he hasn't mentioned** — a surprise guest, a notable song, a stage moment, a mishap, a setlist oddity. One item per question: "A review mentions <X> — do you remember that? Want it in?" Include it only if he confirms; if he doesn't remember it, leave it out. Never put something in the post as Adrian's own experience that he hasn't confirmed.
- Never copy phrasing from a review, and don't quote or link to one unless Adrian asks. Facts are fair; sentences are theirs.

## 5. Draft the review

### Learn the voice first

Read **every** post in `content/posts/gigs/` before drafting. Skip `template.hmmm`, `gigs.11tydata.json`, and any file whose front matter is `layout: redirect-layout.njk`. The posts run from a few lines to a few hundred words; read the whole set so the draft doesn't just echo the most recent one.

What to carry over (check these against the posts again each time rather than trusting this list):

- First person, plain and conversational, with dry self-deprecating asides ("Serves me right for dilly-dallying", "Should have done my research"). Never gushing, never reviewer-speak.
- **Opens with the personal angle** — why he cared about this band, his history with them, who got him there — in one short paragraph, then `<!-- excerpt -->`. The opening paragraph is the index-page excerpt, so it must stand alone.
- Per-act `## Act Name` sections, support acts first and the headliner last, once there is more than one act worth discussing. A short single-act post can be a few plain paragraphs with no headings.
- Honest about duds and the unremarkable ("good, but unremarkable", "this isn't bad") as readily as raves.
- Compares acts to other bands and to other shows he has seen; links to his earlier posts on the same act or venue with a relative link like `/posts/gigs/<stem>/`.
- Specific observations over adjectives — who stood where, a throwaway gesture, a detail about a band member — plus the occasional wry aside.
- Spelling is NZ/British (favourite, colour, realised). Dashes are spaced hyphens ( - ), not em dashes.
- Ends on a short, warm wrap-up of the night (ears ringing, grin, shirt that was out of his size), not a verdict or star rating.
- Length follows how much he had to say. Most are 150–400 words. Don't pad a thin interview into a long post.
- **Always embed the headline act's setlist.fm image**, in addition to the layout's setlist chip, whenever the headliner has a setlist id in `setlistfm` that isn't marked `:empty`. Put it at the very end of the post, after the recording line if there is one, using the id from the front matter (support acts don't get one):

  ```html
  <img src="https://www.setlist.fm/widgets/setlist-image-v1?id=<id>" alt="<Headline Artist> Setlist <Venue>, <City>, <Country> <YYYY>" />
  ```

  e.g. `alt="The Datsuns Setlist San Fran, Wellington, New Zealand 2026"`. If the headliner has no id, or it's `:empty`, omit the image. Where he recorded the show, include the `<a href="...">download the recording</a>` line. Use `{% image %}` / `{% slideshow %}` only if photos were published for placement in the body (the `photos:` front matter already adds the slideshow).

### Write it

- **Every point Adrian shared must appear.** Reword, tighten, reorder and improve the phrasing where you see an opportunity — a better comparison, a stronger line, a smoother transition — but keep his opinions, anecdotes and jokes intact in meaning, and keep his actual words wherever they are already good.
- **Don't invent.** No sensory detail, feelings, setlist moments or anecdotes that Adrian didn't give you or confirm from the review research. If a section feels thin, leave it thin or ask a question, don't embroider.
- Fold in verified facts from other reviews (names, song titles, order) quietly, as part of his sentences.

### Review loop

1. Show the draft in chat as a full candidate post body (not a diff) with the proposed `summary`, `readingtime`, and a short list at the end headed "Points covered" mapping each of Adrian's notes to where it landed, plus any review-sourced facts you added. That lets him see nothing was dropped.
2. Ask what to change. Iterate until he approves. Rewrite the whole body each round; don't leave him merging fragments.
3. When approved, write it into `content/posts/gigs/<stem>.md` in place of the placeholder body, and update the front matter: `summary` (a single line, in his style), `readingtime` (word count ÷ 200, rounded up, minimum `'1 minute'`). Leave the front matter key order alone.
4. Run `npm run spellcheck` and fix real typos (not proper nouns — see README → Spell checking for adding words).

## 6. Fallback: no gig-history row

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

The placeholder body is replaced in step 5 once the interview is done.

`layout: gig-layout.njk` and `tags: ['gig']` are not needed in the file — `content/posts/gigs/gigs.11tydata.json` sets both for the whole directory.

Conventions:

- `title` — always `Artist @ Venue, City`.
- `navtitle` — always `<year> <Artist>`, e.g. `2026 Teen Jesus`. Shorten long artist names; this appears in a 170px sidebar.
- `metadesc` — always `Concert review of <Artist> at <Venue>, <City>, <D Month YYYY>.`
- `setlistfm` — one `Performer Name:id` pair per performer with a setlist, comma-separated (`\,` escapes a literal comma in a name, an optional `:empty` suffix suppresses that performer's chip) — the exact same format as the `Setlist.fm ID` column in `content/GigTracker/gig-history.md`. The performer name must match `headlineArtist` or the relevant `supportArtists` entry exactly, or its chip won't render.
- **Omit optional keys entirely rather than leaving them as empty strings.** The layout guards each with `{% if %}`, and an empty string is truthy enough to render a broken link.
- `readingtime` — word count ÷ 200, rounded up. Most gig write-ups are `'1 minute'`.

## 7. Verify

```bash
npm run build
```

Check `_site/posts/gigs/<stem>/index.html` — confirm the metadata card renders, that a "Setlist" chip appears next to any performer with an id, and that the slideshow appears (one `figure.slideshow-slide` per photo) if photos were set. An unknown set name fails the build. Then confirm it shows on `_site/gigs/index.html` and the home page.

If the gig had a gig-history row, also check `_site/Gig-History/index.html`'s embedded gig data — that row's date should now resolve to a `reviewUrl` of `/posts/gigs/<stem>/` (the "Read the review" link).

## 8. Ship it

Don't commit to `master` — branch and open a PR, per CLAUDE.md:

```bash
git checkout -b gig/<stem>
git add content/posts/gigs/<stem>.md content/_data/photoSets/<stem>.json   # the manifest only if photos were published
git commit -m "Add gig review for <Artist> @ <Venue>, <City>"
git push -u origin gig/<stem>
gh pr create --draft --title "..." --body "..."
```

Open it as a **draft** PR — Adrian reads the drafted review and edits it on the branch before it's ready. No AI attribution in the commit message or PR body. Never push to `master`, never merge.

## 9. Serve it locally — always the last step

Finish by giving Adrian a link to the post running on localhost. Do this while the gig branch is still checked out, so the server is serving the new post.

1. If a dev server for this repo is already running (`preview_list`, or `lsof -nP -iTCP:8080 -sTCP:LISTEN`), reuse it — don't start a second one. Otherwise start it with `preview_start` using the `serve` configuration from `.claude/launch.json` (`npm run serve`, port 8080).
2. Build the URL from the stem: `https://localhost:8080/posts/gigs/<stem>/`. It is `https` when `.certs/` exists and plain `http` when it doesn't — use whichever scheme the started server reports.
3. Load it once to confirm it renders (the slideshow and "Setlist" chip appear if the gig has photos and setlist ids).
4. End the session's output with the clickable URL, on its own line, as the final thing you say.
