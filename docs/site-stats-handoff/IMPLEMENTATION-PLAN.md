# Site Stats: implementation plan (phase 1)

Scope: build `/Site-Stats/` from fresh PostHog data and serve it on localhost
for review. **Phase 2, the daily GitHub Actions rebuild, is out of scope** until
Adrian is happy with the page. It does not touch `build.yml`.

Branch: `site-stats`. One PR, opened ready for review. Adrian merges.

## Decisions (agreed 2026-10-26)

| Topic | Decision |
|---|---|
| Fetch timing | Eleventy data file `content/_data/siteStats.mjs` fetches during every build when a key is set |
| Local key | Gitignored `.env` → `POSTHOG_PERSONAL_API_KEY`, loaded with Node's `--env-file-if-exists` |
| Own traffic | Allowlist: only `$host = 'www.adrianparker.com'` and `internal_user` not true. Every localhost/127.0.0.1 host is excluded by construction |
| Theme-toggle second line | From data: the top 2 countries of `theme_toggled` events, most first |
| Front-page link | None. The sidebar Apps list and `/apps/` pick it up from `tags: ['app']` |
| Handoff docs | Stay in `docs/site-stats-handoff/`. Eleventy never builds them |
| Fallback snapshot | `npm run stats:snapshot` refreshes the committed fallback from live data. Run it before opening the PR |
| No LLM | Every number comes from HogQL plus deterministic code. No Anthropic API, nothing generated |

PostHog facts: project **2097**, EU cloud. The query endpoint is
`POST https://eu.posthog.com/api/projects/2097/query/` with `{"query": {"kind": "HogQLQuery", "query": "…"}}`.
The project timezone is Pacific/Auckland.

## Data flow

```
PostHog HogQL ──fetch──▶ raw rows ──shape (lib/site-stats-fetch.mjs)──▶ snapshot JSON (sample-snapshot.json shape)
                                                                           │
            no key / SITE_STATS_OFFLINE=1 ──▶ content/_data/siteStats.fallback.json
                                                                           ▼
                                               lib/site-stats.mjs (view models) ──▶ njk partials ──▶ HTML/SVG
```

- **`content/_data/siteStats.mjs`**: thin I/O only. Not in `lib/`, so it sits outside coverage, matching `gigHistoryApp.mjs`.
  - If a key is set and offline mode is off, it runs the queries and builds the snapshot. The result is cached in `.cache/site-stats.json` (gitignored) for 1 hour, so `npm run serve` reloads don't re-query.
  - Otherwise it reads the committed fallback and logs `[site-stats] no PostHog key, using committed snapshot from <generatedAt>`.
  - **If a fetch fails, the build fails loudly.** It does not silently fall back, which keeps to the "honest data" rule. *(Say if you'd prefer fallback-with-warning.)*
- **`lib/site-stats-queries.mjs`**: the HogQL strings, plus pure functions that turn result rows into snapshot sections, plus the classification definitions as comments. 100% unit-tested with canned rows.
- **`lib/site-stats.mjs`**: pure view-model functions from snapshot to page, per the README's "Tests to add" list. 100% unit-tested against a frozen fixture.
- **`scripts/site-stats-snapshot.mjs`** (`npm run stats:snapshot`): runs the same fetch and writes `content/_data/siteStats.fallback.json`.
- **Test determinism:** `test:visual`, `test:smoke`, `test:theme` and the new toggle test set `SITE_STATS_OFFLINE=1`, and read a frozen fixture `tests/fixtures/site-stats-sample.json` (a copy of the handoff sample), so baselines never drift with live data. The data file reads the fixture when `SITE_STATS_FIXTURE` is set.

## Classification (to be written as comments in the query module)

Base filter on every query: `event` in scope, the timestamp window, `$host = 'www.adrianparker.com'`, `coalesce(properties.internal_user, false) != true`.

- **Flagged by PostHog**: a visitor with any event PostHog marks as a bot (`$bot` / `$virt_is_bot`, confirmed via `read-data-schema` before use). `botFlaggedVisits` = flagged sessions.
- **Probably automated (our inference)**: not flagged, exactly 1 pageview in the window, GeoIP country not NZ/AU, and median session duration 0 s.
- **People**: everyone else, i.e. more than one pageview, or in NZ/AU.
- **Human-classified traffic** (heatmap, depth bars) = "people" visitors only.

Section mapping (weekly, transitions, landing/exits) is by `$pathname` prefix: `/` → Home, `/posts/gigs/` → Gig review, `/posts/` → Post, `/gigs/` → Gigs index, app permalinks (from the `app` collection's URLs) → App, else Other. Page titles come from `$pathname` mapped to the site's own front matter `title`, so no hand-kept name list is needed. The legacy underscore URL is merged into its current URL.

New queries the sample lacks: `posts.recent90WithGigs`, `posts.allTimeWithGigs`, `theme.topCountries` (top 2).

## Steps

1. **Schema check** via the PostHog MCP (read-only). Confirm events (`$pageview`, `$pageleave`, outbound/theme/404 custom event names from `analytics.njk`) and properties (`$bot`-style flags, `$geoip_*`, `$viewport_width`, `$browser_language`, `$referring_domain`), then prototype every HogQL query and reconcile with the sample's figures.
   → verify: each query's output matches the sample within the effect of the internal/host filter.
2. **`lib/site-stats-queries.mjs` + unit tests**, with canned PostHog rows → snapshot sections.
   → verify: `npm run test:unit` at 100%.
3. **`lib/site-stats.mjs` + unit tests**: every view-model helper in the README list.
   → verify: 100% coverage, and the frozen fixture produces the README's example values (e.g. 416 → "6 min 56 s", "/contact ×3").
4. **Data file, snapshot script, `.env` loading, fixture switch.** Add `--env-file-if-exists=.env` to the build/serve scripts, `.env` and `.cache/` to `.gitignore`, and `stats:snapshot` to package.json.
   → verify: a build with no key logs the fallback; a build with your `.env` logs a live fetch (I never read `.env`).
5. **Page `content/SiteStats/index.njk`** (`app-layout.njk`, `/Site-Stats/`, `tags: ['app']`) plus one partial per section under `content/_includes/site-stats/`. All charts are inline SVG or real `<table>`s with SVG attributes and classes, with no `style=""` and no page JS. The gigs toggle is CSS `:has(:checked)`.
   → verify: the page has no `style` attribute and no extra `<script>`, and html-validate passes.
6. **CSS** in `static/index.css`, scoped `.site-stats`. New tokens in `:root` in the dark-then-`light-dark()` pattern, reusing `--color-accent`, `--color-text` and `--color-cat-*`.
   → verify: 4.5:1 text contrast in both themes (checked in the browser).
7. **Tests**: smoke (h1, anchors, data-as-of line, no extra scripts), a theme extension, a toggle test with JS disabled, and visual regression at 1200 and 390px.
8. **Visual baselines**: new baselines for `/Site-Stats/` in a **separate commit**. Run the full visual suite; existing baselines should not change except for the sidebar Apps list gaining an entry. If any change, I'll stop and show you before regenerating.
9. **Fresh fallback**: `npm run stats:snapshot`, then commit the refreshed `siteStats.fallback.json`.
10. **Serve** on the existing `npm run serve` (https://localhost:8080/Site-Stats/) for your review. Check it in the browser at desktop and 390px, light and dark. Then open the PR.

## Phase 2 (later, not now)

Add a daily `schedule:` and `workflow_dispatch` to `build.yml`, and a repo secret `POSTHOG_PERSONAL_API_KEY` passed to the Build step only. It gets its own PR when you say go.
