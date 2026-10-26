# Site Stats: design handoff

Build a new app page, **Site Stats**, at `/Site-Stats/`. It shows the site's own PostHog analytics for the last 180 days and is built around one question: how much of this traffic is real?

This folder is the whole brief:

| File | What it is |
|---|---|
| `README.md` | This spec. Where it and the design files disagree, this file wins. |
| `sample-snapshot.json` | The data contract, filled with the 26 Oct 2026 figures. Use it as the unit-test fixture and as the build fallback. |
| `design/*.dc.html` | The approved artboards, for visual reference only (see below). |
| `design/canvas.json` | Artboard layout and the designer's handoff note. |

The live design canvas is <https://claude.ai/artifact/S2e3iRCFfZ31BzwCW8fGWQ>. It is private, so ask Adrian to share it if you can't open it.

### About the `.dc.html` files

These come from a design tool. `{{ … }}`, `<sc-for>`, `<sc-if>`, `<x-dc>` and the `class Component extends DCLogic` script are that tool's syntax. **Don't copy them into the site.** Read them for:

- layout
- exact copy
- spacing and type sizes
- the encoding rules, which are mostly in each file's `renderVals()`

The dark and light palettes are in each file's `PAL` constant. Each file's `WEEKS`/`DAYS`/etc. constants hold the same numbers as `sample-snapshot.json`.

Artboards, read top to bottom as one page:

1. `Main.dc.html`: header, "Is it real?" and the raw totals
2. `Audiences.dc.html`: two audiences, geography and devices
3. `Time.dc.html`: weekly views and the day/hour heatmap
4. `Reading.dc.html`: posts slope chart (with the gigs toggle), landing and exit pages, and section moves
5. `Arrivals.dc.html`: referrers, returns and smaller signals
6. `Phone.dc.html`: artboard 1 at 390px in the light theme

---

## Repo rules that apply

Read `CLAUDE.md` and `CLAUDE-code.md` first. In short:

- Work on a branch and open a PR. **Never push to `master`**, and never merge.
- All new JS in `lib/` needs unit tests, and coverage stays at 100% (`.c8rc.json`).
- There is one stylesheet, `static/index.css`. New styles go there, behind a `.site-stats` scope.
- No third-party requests and no cookies. Fonts are already self-hosted (Bebas Neue `@font-face` in `index.css`), so don't add the Google Fonts link the artboards use.
- Run the visual suite before calling it done, and add baselines for the new page in a separate commit.

---

## Hard constraints

1. **Deterministic, build-time output.** The page is plain HTML/SVG generated from a data structure. The core reading experience needs no JavaScript and no charting library.
2. **Snapshot, not live.** The header shows when the data was fetched.
3. **Light and dark.** Both themes work, through the site's existing tokens and the `data-theme` toggle.
4. **Honest data.** Automated traffic is shown clearly, never filtered silently.
5. **Phone width up.** 16px side gutter, no horizontal page scroll. Wide charts scroll inside their own box.
6. **Data-generic copy.** Headings and fixed copy must not state findings that will go stale, such as "traffic peaked in September". A sentence that includes a number gets that number from the data. Don't add new narrative sentences.

---

## Suggested architecture

Adjust this to fit the codebase. Keep the split between fetching and shaping, so the shaping can be unit-tested to 100%.

| Piece | Location | Notes |
|---|---|---|
| Fetch | `scripts/fetch-site-stats.mjs` or `content/_data/siteStats.mjs` | Runs PostHog HogQL queries with a personal API key from an env var (e.g. `POSTHOG_PERSONAL_API_KEY`). Writes or returns an object in the `sample-snapshot.json` shape. With no key (forks, local dev, CI on PRs), fall back to the committed snapshot and log that it did. |
| Shape | `lib/site-stats.mjs` | Pure functions from the snapshot to view models: percentages, bar widths, ratios, colour classes, labels. 100% unit-tested against `sample-snapshot.json`. |
| Page | `content/SiteStats/index.njk` | `layout: app-layout.njk`, `permalink: /Site-Stats/index.html`, `tags: ['app']` so it appears in the Apps index, plus `title`, `navtitle`, `summary`, `metadesc` and `date`. One partial per section is fine. |
| Styles | `static/index.css` | Scoped to `.site-stats`. |
| Schedule | `.github/workflows/build.yml` | A daily rebuild needs a `schedule:` trigger and a repository secret. **This changes the production deploy workflow, so ask Adrian before touching it**, and put it in its own PR. |

Also link the page from the front page (`content/index.njk`), as the brief asks. Ask Adrian where on the front page it should go.

### CSP: avoid `style="…"` attributes

`lib/csp-hash.mjs` hashes inline `<style>`/`<script>` blocks, but any `style` attribute forces `'unsafe-inline'` to stay in `style-src` for that page. The artboards use inline styles everywhere because the design tool needs them. The real page should not. Draw every bar, dot and cell as **inline SVG**, sizing it with SVG attributes (`width`, `height`, `x`, `y`) and colouring it with classes such as `class="ss-real"`. That way the page keeps a strict CSP. If something really can't be done that way, say so in the PR.

---

## Visual language (applies to every section)

- **Colour means credibility.** The accent colour (`--color-accent`: orange in dark, navy in light) means "behaved like a person". Grey means automated or unknown. Section colours are used only in the weekly small multiples.
- **Solid vs hollow/dashed.** Solid grey is something PostHog labelled. A hollow ring or dashed outline is our own inference from behaviour.
- **Big numbers** use Bebas Neue, the site's display face. Body text is the site's body face.
- **Mirror rows** ("butterfly"): visitors bar to the left, views bar to the right, the label in the middle. Used for countries and devices.

### Palette

These are the artboard values. Map them to existing tokens where they match, and add new tokens to the `:root` block the same way the existing ones are declared: a plain dark value, then a `light-dark()` override.

| Role | Dark | Light | Existing token? |
|---|---|---|---|
| Accent / real | `#ff9900` | `#1c4f8c` | `--color-accent` |
| Text | `#cccccc` | `#1e2a3a` | `--color-text` |
| Strong text | `#f0f0f0` | `#0f1824` | new |
| Muted text | `#a3a3a3` | `#55606b` | new. The site's dark `--color-muted` (#666) fails contrast for small text, so don't use it here. |
| Surface (cards) | `#353535` | `#efe9da` | new |
| Rule | `#555555` | `rgba(28,79,140,0.28)` | close to `--color-rule` |
| Noise / automated | `#7a7a7a` | `#9aa1a9` | new |
| Noise, faint | `#4a4a4a` | `#ddd6c4` | new |
| Accent mid / low | accent at 62% / 36% alpha | accent at 62% / 34% alpha | new |
| Empty heatmap cell | `#333333` | `#ebe5d6` | new |
| Weekly section colours | `#5b8def #4ac9a8 #e0714a #e0b84a #b26fe0 #7a8290` | `#3f6fd6 #1f8f72 #b04f24 #a9790a #8a4bc2 #5c6270` | reuse the `--color-cat-*` tokens |

All text must meet 4.5:1 contrast in both themes.

---

## Page spec, top to bottom

The copy below is final. `N` marks a value that comes from the data.

### Header (artboard 1)

- Breadcrumb: `adrianparker.com › Apps › Site Stats`. Use whatever the app layout provides, and drop it if the app nav already covers this.
- `<h1>` **Site Stats**: the site's global h1, as on every other app page: Bebas Neue, accent colour, 48px (3em). Every section `<h2>` is the global h2, 24px (1.5em); `<h3>`s are the global h3. Big numbers are at most 36px, so never as large as the h1.
- Lede: "What PostHog saw on this site over the last N days."
- Meta row, muted and 13px, wrapping:
  - "Data as of **Mon 26 Oct 2026, 6:02 am NZDT**", from `generatedAt` formatted in Pacific/Auckland
  - "Covers 29 Apr – 26 Oct 2026 (180 days)"
  - "Production site only · NZ time · weeks start Monday"
- Section nav: pill links to in-page anchors, wrapping, each target at least 44px tall:
  - Is it real?
  - Two audiences
  - Over time
  - What's read
  - Arrivals & returns
  - Small signals

### 1. Is it real? (`#real`)

**H2:** "N visitors. About N were people." (reported, people)

**Intro:** "Every dot below is one visitor PostHog counted."

**Dot field** (left, flexible about 520px): one 12px circle per reported visitor, with 5px gaps, wrapping. Order and style:

1. `people` dots: filled accent
2. `inferredAutomated` dots: hollow, 2px noise-coloured ring
3. `flaggedByPostHog` dots: filled noise

Give it `role="img"` and an aria-label that states all three counts. The legend below repeats the three counts: "N looked like people", "N probably automated (our inference)", "N flagged as bots by PostHog".

At 448 dots, a single SVG with `<circle>`s laid out on a computed grid is the simplest way to avoid style attributes. Lay out the columns from a fixed width with `viewBox`, so it reflows by scaling.

**Step list** (right, flexible about 360px):

1. **N** total visitors (Bebas 36px), with a rule below
2. **N** flagged as bots by PostHog, plus a bar at N/reported width in noise
3. **N** probably automated, plus a bar at N/reported width in noise at 60% opacity, and a muted note: "Not flagged, but viewed exactly one page, from outside NZ and Australia, median visit 0 seconds. Our inference."
4. **N** looked like people (accent), plus an accent bar at N/reported width (min 4px), and a muted note: "Viewed more than one page, or were in NZ or Australia."
5. A surface card: "Of those N, two separate measures of engagement:" then **N** "viewed 10 or more pages" and **N** "came back on 5 or more days". Make clear these two are not nested steps.

`flaggedReasons` is no longer shown. It stays in the snapshot for possible later use.

### Raw totals

**H2:** "The raw totals, with that in mind". Beside it, muted: "As PostHog counts them. Not bot-filtered."

Six tiles in an auto-fit grid (min 150px). Each tile has:

- a label
- the value in Bebas 36px
- an optional note
- a 3px top border: noise for the first three tiles, accent for the last three

| Label | Value | Note |
|---|---|---|
| Visitors | `totals.visitors` | "About `funnel.people` people." |
| Page views | `totals.pageViews` (thousands separator) | "Includes automated." |
| Bot-flagged visits | `totals.botFlaggedVisits` | "PostHog identified." |
| Outbound link clicks | `totals.outboundClicks` | *(no note)* |
| Theme toggles | `totals.themeToggles` | "By `totals.themeTogglePeople` people." |
| Not-found hits | `totals.notFoundHits` | The single most-hit path: "`path` ×`hits`", e.g. "/contact ×3". Ties go to the first in the list. |

### 2. Two audiences (artboard 2, `#audiences`)

**H2:** "Two audiences hiding in one total"

**Intro:** "Visitors from New Zealand and Australia compared to the rest of the world."

**Comparison butterfly.** Columns are "NZ & Australia" (bold, accent), a muted "measure" header in the middle, and "Rest of world" (bold). There is one row per `audiences.compare` item:

- NZ/AU value, then an accent bar growing leftwards
- the measure name in the middle
- a noise bar growing rightwards, then the rest-of-world value
- each row scaled to its own max, with a minimum bar of 3px so a 0 still shows

Value formats are set by `format`:

- `int`
- `2dp`
- `percent` (`34.7%`)
- `seconds`: shown as "N s" under 60, otherwise "M min S s". For example, 416 → "6 min 56 s".

**Depth card** (surface): "How many pages each visitor viewed", plus the muted note "Human-classified: not flagged by PostHog and not inferred to be automated. Each bar is 100% of its group."

There are two 100% stacked bars, NZ & Australia and Rest of world, each headed "· N visitors". The segments are:

| Segment | Colour |
|---|---|
| 1 page | noise-faint |
| 2–3 | accent-low |
| 4–9 | accent-mid |
| 10+ | accent |

Non-zero segments are at least 4px. A legend gives the counts. The footer line reads "The N visitors who viewed 10 or more pages produced **N views**, most of all human-classified views." It uses `funnel.viewed10Plus` and `audiences.heavyReaderViews`. Keep "most of" only while heavyReaderViews is more than half the human-classified views, and otherwise drop that clause.

**H2:** "Where they are: visitors against views" (no intro)

**Country mirror rows:** "← visitors" | "country" | "views →". Both sides share one scale: the max of all visitors and views. Every row shows a whole-number multiplier after the views figure, `×round(views/visitors)`, in muted text. If the ratio is 2 or more, the views bar is accent and the country name is bold. Otherwise the views bar is noise.

**Top cities card:** "Top cities by visitors", a ranked list in an auto-fill grid (min 300px). Each row has the name, a small bar and a count.

- The name is "City, CC". When `city` is null, show the country and a bordered muted tag "city unknown". PostHog leaves `$geoip_city_name` null when it resolves only the country.
- The bar is accent for a city in NZ or AU, otherwise noise.
- No "data centre" tags. That would need a hand-kept list, so it was dropped.

**H2:** "What they read it on" (no intro)

**Device mirror rows:** same as countries, with the middle header "browser, system", the same multiplier on every row, and a shared scale.

Below are two cards side by side, wrapping:

- **Window width · visitors:** five columns, each with its count above and its label below. The muted note reads "N visitors report a window 1500px or wider, typical of headless browsers." N is the 1500+ bucket.
- **Browser language · visitors:** a horizontal bar list.

### 3. Over time (artboard 3, `#time`)

**H2:** "Page views, week by week"

**Intro:** "Page views per week. These are not bot-filtered."

**Weekly totals column chart**, 240px tall: one column per week, in accent.

- Print the total above any column of 40 or more, and above the partial week.
- Label every 4th week on the x axis ("27 Apr").
- The current, incomplete week is a dashed accent outline with no fill. The caption reads "The week of 26 Oct is still in progress." Use the true date.
- A week is partial if it starts within 7 days of `generatedAt` in NZ time.
- No annotation markers. The A/B/C notes in older drafts were dropped as data-specific.

**"By section"**, with the muted note "Same weeks, one panel per section, all on the same scale (N views)":

- Six small-multiple panels in an auto-fill grid (min 300px), each 72px tall.
- Each panel is headed with its section name and "N views", and has month ticks.
- Bars use the section colour, and the partial week is dashed.
- All panels share one y scale: the max single-week, single-section value, rounded up to a tidy number. It was 40 in the sample.

**H2:** "When the site is read"

**Intro:** "Page views by day and hour, New Zealand time, human-classified traffic. Darker means more views."

**Heatmap:** 7 rows (Mon to Sun) by 24 columns, 30px tall cells with 3px gaps.

- Zero is the empty colour.
- Otherwise the cell is accent at alpha `0.12 + 0.88 × sqrt(v / max)`.
- Hour labels: midnight, 3am, 6am, 9am, noon, 3pm, 6pm, 9pm.
- A right-hand column shows the day total as a small noise bar plus the number.
- Each cell carries an accessible label ("Mon 23:00, 33 views"). A real `<table>` with visually hidden numbers is a good fit.
- Wrap it in an `overflow-x: auto` box with min-width 640px.
- **No highlighted cells and no legend.** The owner and reader callouts were removed.

### 4. What's read (artboard 4, `#read`)

**H2:** "What's being read now, against all time"

**Intro**, plus the toggle on the right (they wrap):

- **Unchecked (default):** "Posts ranked by views, gig reviews excluded."
- **Checked:** "Posts ranked by views, gig reviews included." Only the word *excluded/included* changes.

**Toggle:** a real checkbox, `<input type="checkbox">` plus a `<label>`, reading "Include gig reviews", unchecked by default. The pill label is at least 44px tall. It needs no JavaScript:

- render both charts and both intro sentences
- show and hide them with `:checked ~` sibling selectors, or `:has(:checked)`, from the checkbox
- keep the hidden ones out of the accessibility tree with `display: none`

**Slope chart**, inline SVG with a 780×410 viewBox and min-width 640px inside an `overflow-x: auto` box:

- Left column: "ALL TIME · views", posts ranked 1..n, written as "Title  **views**", right-aligned.
- Right column: "LAST 90 DAYS · views", written as "**views**  Title".
- A line joins each post's two ranks. Rows are 40px apart.
- A post that only appears on the right gets a short dashed stub and a muted "new" tag.
- Truncate long titles with "…" at about 32 characters.

Line style and legend:

| Movement | Line | Label colour |
|---|---|---|
| Rising (rank improved) | accent, 4px | accent |
| Falling 2+ places | noise, 3px | text |
| Otherwise | faint, 2px | text |

**Gig-inclusive variant:** the same chart, built from `posts.recent90WithGigs` and `posts.allTimeWithGigs`. **That data isn't in the sample.** Add the two queries to the fetch step. Until they exist, the checked state shows a dashed placeholder box, so render that as a graceful empty state ("Not enough data yet").

**H2:** "Where visits start, and where they end" (no intro). Two blocks side by side, wrapping:

- **Landing pages · sessions** (wider, flex 3). The legend reads "left after one page" (noise) and "kept going" (accent). Each row has:
  - the name, truncated
  - a stacked bar of single-page then continued sessions, scaled to the max sessions
  - the session count
  - a muted "N% left" (single-page / sessions, rounded)
- **Last page of longer visits · sessions with 2+ pages** (flex 2): a bar list. The top row is accent, the rest are noise.

**H2:** "How people move between sections"

**Intro:** "Each square counts moves from one page to the next within a visit."

**5×5 heat table**, a real `<table>` with a "from ↓ · to →" corner, column and row headers, and the count printed in each cell:

- A zero cell is the empty colour.
- Otherwise the cell is accent at alpha `0.12 + 0.88 × (n / max)`.
- Text flips to the on-accent colour (`#1f1f1f` dark / `#ffffff` light) when alpha is over 0.55.
- Diagonal cells get an inset 2px dashed muted outline.
- The footnote has a dashed swatch and reads "Same-section moves include page reloads."

### 5. Arrivals and small signals (artboard 5, `#arrivals`)

**H2:** "How people arrive, and who comes back". Two columns, wrapping.

**Referrers** (left):

- "**N%** of visitors arrive with no referrer." The share is Direct ÷ total.
- One 100% stacked bar across the referrer groups.
- Then a list: colour swatch, **group**, muted detail, count.

| Group | Colour |
|---|---|
| Direct | noise |
| Internal | noise-faint |
| Search | accent-mid |
| Shared links | accent |
| Other | accent-low |

**Returns** (right):

- "**N** visitors came back on another day. N of them on five days or more." N is everyone not in "1 day". Spell out numbers under 10 only if that is the site's house style; otherwise use digits.
- A dot field of 10px circles, one per visitor, ordered 5+ days, then 3–4, then 2, then 1:

| Days visited | Dot |
|---|---|
| 5+ days | filled accent |
| 3–4 days | filled accent-mid |
| 2 days | filled accent-low |
| 1 day | hollow noise ring |

- A legend with counts.

**H2:** "Smaller signals". Three surface cards in an auto-fit grid (min 280px):

1. **N outbound link clicks.** Per destination, the name plus one 10px accent square per click. No footnote.
2. **N "not found" hits.** Each path in `<code>` with its count. No explanatory lines.
3. **N theme toggles.** One small accent mark per toggle, wrapping, and one person glyph per person (a stroke SVG, `aria-hidden`). The muted note has two lines: "N people, average N toggles each" (round toggles ÷ people), then "New Zealand, Australia". **The second line is a fixed string in the design. Ask Adrian whether it should come from the data** (the countries of toggle events) or be dropped.

**No method footer.** The "How this page is made" section in older drafts was removed. The header meta row carries the provenance.

---

## Responsive behaviour

- Content max-width 1080px with clamp(16px, 4vw, 48px) side padding, inside the existing `app-column`.
- Two-column rows are flex-wrap, so they stack below roughly 900px.
- Mirror rows use `minmax(0,1fr) minmax(110px,170px) minmax(0,1fr)`. Check them at 390px. If the bars get too thin, shrink the middle column, or put the label above the bars on narrow screens.
- These scroll inside their own box: slope chart, heatmap, transition table.
- The dot fields reflow, or scale if done as SVG.

## Accessibility

- One `<h1>`, then `<h2>` per section and `<h3>` in cards.
- Every chart has a text alternative: `role="img"` plus a label that states the key numbers, or a real table.
- Decorative glyphs are `aria-hidden`.
- Colours that carry meaning also differ in lightness or fill style, never hue alone.

---

## Tests to add

- **Unit (`tests/unit/site-stats.test.mjs`), 100% of `lib/site-stats.mjs`:**
  - percentages and rounding
  - multiplier rounding
  - mirror scale
  - `seconds` formatting (0, 5, 63, 416)
  - top not-found pick and tie-break
  - partial-week detection
  - slope-chart rank and movement classes, including a post only in one list
  - referrer share
  - returners count
  - "most of" clause logic
  - city-unknown tagging
  - the empty state when `*WithGigs` is null
- **Smoke:** `/Site-Stats/` builds, contains the h1, all section anchors, the data-as-of line, and no `<script>` beyond the site's own.
- **Theme:** the page is readable in both themes (extend `tests/theme.test.mjs`).
- **Toggle:** the checked and unchecked states show the right sentence and chart, with JS disabled.
- **Visual regression:** new baselines at 1200px and 390px, in a separate commit (see the `update-baselines` skill).

## Open questions for Adrian

1. The daily `schedule:` rebuild and the PostHog API secret mean a change to `build.yml`. Is that OK, and is it a separate PR?
2. Should the API key live only as a GitHub secret, with local builds using the committed snapshot?
3. Where should the front-page link go?
4. Theme toggles' "New Zealand, Australia" line: from data, fixed, or dropped?
5. The exact HogQL definitions of "human-classified" and "our inference" need to be written down in the fetch code, as comments, so the funnel is reproducible.
