/*
  Builds the Site Stats snapshot from PostHog. Every query is HogQL, and every
  number on the page is either a query result or arithmetic on one: there is
  no hand-kept list of findings, and no model or LLM anywhere in the chain.

  The PostHog call itself is injected as `run(sql) -> rows`, so this module is
  pure apart from that and is unit-tested end to end with canned rows. The
  real HTTP call, the cache and the fallback live in content/_data/siteStats.mjs.

  ─── What is counted ────────────────────────────────────────────────────────

  Only events from the production host, and never events tagged
  `internal_user` (the owner's own devices, see partials/analytics.njk). This
  is an allowlist, so localhost, 127.0.0.1 and any future preview host are
  excluded without being named.

  "Visitor" is a PostHog person with at least one $pageview in the window.

  ─── How visitors are classified ────────────────────────────────────────────

  Each visitor falls in exactly one class, decided over the whole window:

  flagged    PostHog's own bot detection ($virt_is_bot) marked at least one
             of their pageviews. Solid grey on the page.
  inferred   Not flagged, but viewed exactly one page, and no pageview came
             from New Zealand or Australia. Our inference, so drawn hollow.
  people     Everyone else: viewed more than one page, or was in NZ or AU.

  "Human-classified" traffic (the heatmap, the depth bars, heavy readers) is
  pageviews by the `people` class only. Everything else is shown as PostHog
  counts it, automated traffic included, so nothing is filtered silently.
*/

export const SITE_HOST = "www.adrianparker.com";
export const TIMEZONE = "Pacific/Auckland";
export const PERIOD_DAYS = 180;
export const RECENT_DAYS = 90;
// Before the PostHog project existed, so "all time" means all of it.
export const ALL_TIME_START = "2023-01-01";

const HOME_COUNTRIES = "('NZ', 'AU')";

// ─── Dates ───────────────────────────────────────────────────────────────────

const NZ_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit"
});

/** The calendar date (YYYY-MM-DD) of `date` in New Zealand. */
export function nzDate(date) {
  return NZ_DATE.format(date);
}

/** Adds `days` (may be negative) to a YYYY-MM-DD date. */
export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday on or before a YYYY-MM-DD date. */
export function mondayOf(isoDate) {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return addDays(isoDate, -((weekday + 6) % 7));
}

/** The three windows every query is bounded by, ending today in NZ. */
export function periodFor(now) {
  const periodEnd = nzDate(now);
  return {
    generatedAt: now.toISOString(),
    periodDays: PERIOD_DAYS,
    periodStart: addDays(periodEnd, -(PERIOD_DAYS - 1)),
    periodEnd,
    recentStart: addDays(periodEnd, -(RECENT_DAYS - 1))
  };
}

// ─── Pages and sections ──────────────────────────────────────────────────────

/*
  A path as PostHog recorded it, folded so that every spelling of one page
  lands on one key: lower case, underscores as hyphens (one post was first
  published at an underscore URL), and a trailing slash. The same fold is
  done in SQL by PATH below, so grouping happens server side.
*/
export function normalisePath(path) {
  const folded = String(path).toLowerCase().replaceAll("_", "-");
  return folded.endsWith("/") ? folded : `${folded}/`;
}

const PATH = "replaceRegexpOne(lower(replaceAll(properties.$pathname, '_', '-')), '([^/])$', '\\\\1/')";

/**
 * Indexes the site's own pages, `[{ path, title, kind, redirectTo? }]` with
 * kind one of home | post | gig | app | index, by normalised path. A page
 * that is only a redirect stub (a renamed gig) indexes as the page it
 * redirects to, so views at the old URL count towards the new one.
 */
export function pageIndex(pages) {
  const index = new Map(pages.map((page) => [normalisePath(page.path), page]));
  for (const [key, page] of index) {
    if (page.redirectTo) {
      const target = index.get(normalisePath(page.redirectTo));
      if (target) index.set(key, target);
      else index.delete(key);
    }
  }
  return index;
}

/*
  Sums rows that share a label in field `by` (an old and a new URL of one
  page, or two PostHog names for one browser), then keeps the top `limit` by
  `key`. Ties keep first-seen order. Summed visitor counts can double count
  someone seen under both names, which is rare enough to accept here.
*/
export function mergeRows(rows, by, key, limit) {
  const merged = new Map();
  for (const row of rows) {
    const seen = merged.get(row[by]);
    if (!seen) merged.set(row[by], { ...row });
    else for (const field of Object.keys(row)) if (field !== by) seen[field] += row[field];
  }
  return [...merged.values()].sort((a, b) => b[key] - a[key]).slice(0, limit);
}

/*
  Which part of the site a path belongs to. The weekly chart uses all six;
  the transitions table drops "Other" and uses the singular names.
*/
export const WEEKLY_SECTIONS = ["Home", "Posts", "Gig reviews", "Gigs index", "Apps", "Other"];
export const TRANSITION_SECTIONS = ["Home", "Post", "Gig review", "Gigs index", "App"];

export function sectionOf(path, index) {
  const key = normalisePath(path);
  if (key === "/") return 0;
  if (key.startsWith("/posts/gigs/")) return 2;
  if (key.startsWith("/posts/")) return 1;
  if (key === "/gigs/") return 3;
  if (key === "/apps/" || index.get(key)?.kind === "app") return 4;
  return 5;
}

/** The label a page is shown under: its own title, or the path itself. */
export function pageLabel(path, index) {
  const key = normalisePath(path);
  const page = index.get(key);
  if (!page) return path;
  if (page.kind === "gig") return `Gig: ${page.title}`;
  if (page.kind === "app") return `${page.title} app`;
  return page.title;
}

// ─── Query building blocks ───────────────────────────────────────────────────

function since(isoDate) {
  return `timestamp >= toDateTime('${isoDate} 00:00:00', '${TIMEZONE}')`;
}

function scope(isoDate) {
  return `${since(isoDate)}
    AND properties.$host = '${SITE_HOST}'
    AND coalesce(properties.internal_user, false) != true`;
}

const LOCAL_TIME = `toTimeZone(timestamp, '${TIMEZONE}')`;

/*
  One row per visitor with the facts the classification needs. A CTE is
  inlined wherever it is referenced, so each query that uses it pays for one
  scan of the window's pageviews.
*/
function visitors(start) {
  return `visitors AS (
    SELECT
      person_id,
      max($virt_is_bot) AS is_flagged,
      count() AS pageviews,
      max(properties.$geoip_country_code IN ${HOME_COUNTRIES}) AS is_home,
      uniq(toDate(${LOCAL_TIME})) AS active_days,
      median(session.$session_duration) AS median_duration,
      multiIf(is_flagged, 'flagged', pageviews = 1 AND NOT is_home, 'inferred', 'people') AS class
    FROM events
    WHERE event = '$pageview' AND ${scope(start)}
    GROUP BY person_id
  )`;
}

function peopleOnly() {
  return `person_id IN (SELECT person_id FROM visitors WHERE class = 'people')`;
}

// ─── The queries ─────────────────────────────────────────────────────────────

/*
  Each entry is `sql(period)` plus `shape(rows, context)`. Rows arrive as
  arrays in SELECT order, as PostHog's query API returns them.
*/
export const QUERIES = {
  totals: {
    sql: (p) => `
      SELECT
        countIf(event = '$pageview') AS page_views,
        uniqIf(person_id, event = '$pageview') AS visitors,
        countIf(event = 'outbound_link_clicked') AS outbound_clicks,
        countIf(event = 'theme_toggled') AS theme_toggles,
        uniqIf(person_id, event = 'theme_toggled') AS theme_toggle_people,
        countIf(event = 'not_found') AS not_found_hits,
        uniqIf($session_id, event = '$pageview' AND $virt_is_bot) AS bot_flagged_visits
      FROM events
      WHERE event IN ('$pageview', 'outbound_link_clicked', 'theme_toggled', 'not_found')
        AND ${scope(p.periodStart)}`,
    shape: ([[pageViews, visitors, outboundClicks, themeToggles, themeTogglePeople, notFoundHits, botFlaggedVisits]]) =>
      ({ pageViews, visitors, outboundClicks, themeToggles, themeTogglePeople, notFoundHits, botFlaggedVisits })
  },

  funnel: {
    sql: (p) => `
      WITH ${visitors(p.periodStart)}
      SELECT
        count() AS reported,
        countIf(class = 'flagged') AS flagged_count,
        countIf(class = 'inferred') AS inferred_count,
        countIf(class = 'people') AS people_count,
        countIf(class = 'people' AND pageviews >= 10) AS viewed_10_plus,
        countIf(class = 'people' AND active_days >= 5) AS returned_5_plus_days,
        round(medianIf(median_duration, class = 'inferred')) AS inferred_median_seconds,
        sumIf(pageviews, class = 'people') AS human_views,
        sumIf(pageviews, class = 'people' AND pageviews >= 10) AS heavy_reader_views
      FROM visitors`,
    shape: ([[reported, flagged, inferred, people, viewed10Plus, returned5PlusDays, inferredMedianSeconds, humanViews, heavyReaderViews]]) => ({
      reported,
      flaggedByPostHog: flagged,
      inferredAutomated: inferred,
      people,
      viewed10Plus,
      returned5PlusDays,
      inferredMedianSeconds: inferredMedianSeconds ?? 0,
      humanViews,
      heavyReaderViews
    })
  },

  flaggedReasons: {
    sql: (p) => `
      SELECT $virt_bot_name AS reason, uniq($session_id) AS visits
      FROM events
      WHERE event = '$pageview' AND $virt_is_bot AND ${scope(p.periodStart)}
      GROUP BY reason
      ORDER BY visits DESC, reason`,
    shape: (rows) => rows.map(([label, visits]) => ({ label, visits }))
  },

  compare: {
    sql: (p) => `
      SELECT
        is_home,
        count() AS sessions,
        sum(pageviews) AS session_pageviews,
        countIf(pageviews = 1) AS single_page,
        median(duration) AS median_duration,
        avgIf(duration, pageviews > 1) AS avg_multi_page_duration
      FROM (
        SELECT
          $session_id AS session_key,
          count() AS pageviews,
          max(properties.$geoip_country_code IN ${HOME_COUNTRIES}) AS is_home,
          max(session.$session_duration) AS duration
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
        GROUP BY session_key
      )
      GROUP BY is_home`,
    shape: (rows) => {
      const side = (home) => rows.find((row) => Boolean(row[0]) === home) ?? [home, 0, 0, 0, 0, 0];
      const measures = ([, sessions, views, single, median, avgMulti]) => [
        sessions,
        sessions ? round(views / sessions, 2) : 0,
        sessions ? round((single / sessions) * 100, 1) : 0,
        Math.round(median ?? 0),
        Math.round(avgMulti ?? 0)
      ];
      const home = measures(side(true));
      const rest = measures(side(false));
      return [
        ["Sessions", "int"],
        ["Pages per session", "2dp"],
        ["Single-page sessions", "percent"],
        ["Median time on site", "seconds"],
        ["Average time, multi-page sessions", "seconds"]
      ].map(([measure, format], i) => ({ measure, nzau: home[i], rest: rest[i], format }));
    }
  },

  depth: {
    sql: (p) => `
      WITH ${visitors(p.periodStart)}
      SELECT is_home, multiIf(pageviews = 1, 0, pageviews <= 3, 1, pageviews <= 9, 2, 3) AS bucket, count() AS visitor_count
      FROM visitors
      WHERE class = 'people'
      GROUP BY is_home, bucket`,
    shape: (rows) => {
      const counts = (home) => [0, 1, 2, 3].map((bucket) =>
        rows.find((row) => Boolean(row[0]) === home && row[1] === bucket)?.[2] ?? 0);
      return { buckets: ["1 page", "2–3", "4–9", "10+"], nzau: counts(true), rest: counts(false) };
    }
  },

  countries: {
    sql: (p) => `
      SELECT coalesce(properties.$geoip_country_name, 'Unknown') AS country, uniq(person_id) AS visitor_count, count() AS views
      FROM events
      WHERE event = '$pageview' AND ${scope(p.periodStart)}
      GROUP BY country
      ORDER BY visitor_count DESC, views DESC, country
      LIMIT 15`,
    shape: (rows) => rows.map(([name, visitors, views]) => ({ name, visitors, views }))
  },

  cities: {
    sql: (p) => `
      SELECT
        properties.$geoip_city_name AS city,
        properties.$geoip_country_code AS country_code,
        coalesce(properties.$geoip_country_name, 'Unknown') AS country,
        uniq(person_id) AS visitor_count
      FROM events
      WHERE event = '$pageview' AND ${scope(p.periodStart)}
      GROUP BY city, country_code, country
      ORDER BY visitor_count DESC, country, city
      LIMIT 11`,
    shape: (rows) => rows.map(([city, countryCode, country, visitors]) => ({ city, countryCode, country, visitors }))
  },

  devices: {
    sql: (p) => `
      SELECT
        coalesce(properties.$browser, 'Unknown') AS browser,
        coalesce(properties.$os, 'Unknown') AS os,
        uniq(person_id) AS visitor_count,
        count() AS views
      FROM events
      WHERE event = '$pageview' AND ${scope(p.periodStart)}
      GROUP BY browser, os
      ORDER BY visitor_count DESC, views DESC, browser, os`,
    shape: (rows) => mergeRows(rows.map(([browser, os, visitors, views]) =>
      ({ name: deviceName(browser, os), visitors, views })), "name", "visitors", 8)
  },

  windowWidths: {
    sql: (p) => `
      SELECT multiIf(width < 500, 0, width < 768, 1, width < 1100, 2, width < 1500, 3, 4) AS bucket, count() AS visitor_count
      FROM (
        SELECT person_id, argMin(properties.$viewport_width, timestamp) AS width
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
        GROUP BY person_id
      )
      WHERE width IS NOT NULL
      GROUP BY bucket`,
    shape: (rows) => ["<500", "500–767", "768–1099", "1100–1499", "1500+"].map((label, bucket) =>
      ({ label, visitors: rows.find((row) => row[0] === bucket)?.[1] ?? 0 }))
  },

  languages: {
    sql: (p) => `
      SELECT language, count() AS visitor_count
      FROM (
        SELECT person_id, argMin(properties.$browser_language_prefix, timestamp) AS language
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
        GROUP BY person_id
      )
      WHERE language IS NOT NULL AND language != ''
      GROUP BY language
      ORDER BY visitor_count DESC, language
      LIMIT 6`,
    shape: (rows) => rows.map(([code, visitors]) => ({ name: languageName(code), visitors }))
  },

  weekly: {
    sql: (p) => `
      SELECT toString(toStartOfWeek(${LOCAL_TIME}, 1)) AS week_of, ${PATH} AS path, count() AS views
      FROM events
      WHERE event = '$pageview' AND ${scope(mondayOf(p.periodStart))}
      GROUP BY week_of, path
      LIMIT 10000`,
    shape: (rows, { period, index }) => {
      const weeks = [];
      for (let week = mondayOf(period.periodStart); week <= period.periodEnd; week = addDays(week, 7)) {
        weeks.push({ weekOf: week, views: WEEKLY_SECTIONS.map(() => 0) });
      }
      for (const [weekOf, path, views] of rows) {
        const week = weeks.find((w) => w.weekOf === weekOf);
        if (week) week.views[sectionOf(path, index)] += views;
      }
      return { sections: WEEKLY_SECTIONS, weeks };
    }
  },

  heatmap: {
    sql: (p) => `
      WITH ${visitors(p.periodStart)}
      SELECT toDayOfWeek(${LOCAL_TIME}) AS weekday, toHour(${LOCAL_TIME}) AS hour, count() AS views
      FROM events
      WHERE event = '$pageview' AND ${scope(p.periodStart)} AND ${peopleOnly()}
      GROUP BY weekday, hour`,
    shape: (rows) => {
      const views = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const [weekday, hour, count] of rows) views[weekday - 1][hour] = count;
      return { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], views };
    }
  },

  postsRecent: {
    sql: (p) => postViews(p.recentStart)
  },

  postsAllTime: {
    sql: () => postViews(ALL_TIME_START)
  },

  landing: {
    sql: (p) => `
      SELECT entry_path, count() AS sessions, countIf(pageviews = 1) AS single_page
      FROM (
        SELECT $session_id AS session_key, argMin(${PATH}, timestamp) AS entry_path, count() AS pageviews
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
        GROUP BY session_key
      )
      GROUP BY entry_path
      ORDER BY sessions DESC, entry_path`,
    shape: (rows, { index }) => mergeRows(rows.map(([path, sessions, singlePage]) =>
      ({ page: pageLabel(path, index), sessions, singlePage })), "page", "sessions", 10)
  },

  exits: {
    sql: (p) => `
      SELECT exit_path, count() AS sessions
      FROM (
        SELECT $session_id AS session_key, argMax(${PATH}, timestamp) AS exit_path, count() AS pageviews
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
        GROUP BY session_key
      )
      WHERE pageviews >= 2
      GROUP BY exit_path
      ORDER BY sessions DESC, exit_path`,
    shape: (rows, { index }) => mergeRows(rows.map(([path, sessions]) =>
      ({ page: pageLabel(path, index), sessions })), "page", "sessions", 10)
  },

  transitions: {
    sql: (p) => `
      SELECT from_path, to_path, count() AS moves
      FROM (
        SELECT
          ${PATH} AS to_path,
          lagInFrame(${PATH}, 1, '') OVER (PARTITION BY $session_id ORDER BY timestamp ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS from_path
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
      )
      WHERE from_path != ''
      GROUP BY from_path, to_path
      LIMIT 10000`,
    shape: (rows, { index }) => {
      const counts = TRANSITION_SECTIONS.map(() => TRANSITION_SECTIONS.map(() => 0));
      for (const [from, to, moves] of rows) {
        const a = sectionOf(from, index);
        const b = sectionOf(to, index);
        if (a < 5 && b < 5) counts[a][b] += moves;
      }
      return { sections: TRANSITION_SECTIONS, counts };
    }
  },

  referrers: {
    sql: (p) => `
      SELECT channel, domain, count() AS visitor_count
      FROM (
        SELECT
          person_id,
          argMin(session.$channel_type, timestamp) AS channel,
          argMin(properties.$referring_domain, timestamp) AS domain
        FROM events
        WHERE event = '$pageview' AND ${scope(p.periodStart)}
        GROUP BY person_id
      )
      GROUP BY channel, domain
      ORDER BY visitor_count DESC, domain`,
    shape: (rows) => groupReferrers(rows)
  },

  returns: {
    sql: (p) => `
      WITH ${visitors(p.periodStart)}
      SELECT multiIf(active_days = 1, 0, active_days = 2, 1, active_days <= 4, 2, 3) AS bucket, count() AS visitor_count
      FROM visitors
      GROUP BY bucket`,
    shape: (rows) => ["1 day", "2 days", "3–4 days", "5+ days"].map((label, bucket) =>
      ({ label, visitors: rows.find((row) => row[0] === bucket)?.[1] ?? 0 }))
  },

  outbound: {
    sql: (p) => `
      SELECT replaceRegexpOne(coalesce(properties.host, 'unknown'), '^www\\\\.', '') AS destination, count() AS clicks
      FROM events
      WHERE event = 'outbound_link_clicked' AND ${scope(p.periodStart)}
      GROUP BY destination
      ORDER BY clicks DESC, destination`,
    shape: (rows) => rows.map(([destination, clicks]) => ({ destination, clicks }))
  },

  notFound: {
    sql: (p) => `
      SELECT coalesce(properties.path, 'unknown') AS path, count() AS hits
      FROM events
      WHERE event = 'not_found' AND ${scope(p.periodStart)}
      GROUP BY path
      ORDER BY hits DESC, path`,
    shape: (rows) => rows.map(([path, hits]) => ({ path, hits }))
  },

  themeCountries: {
    sql: (p) => `
      SELECT coalesce(properties.$geoip_country_name, 'Unknown') AS country, count() AS toggles
      FROM events
      WHERE event = 'theme_toggled' AND ${scope(p.periodStart)}
      GROUP BY country
      ORDER BY toggles DESC, country
      LIMIT 2`,
    shape: (rows) => rows.map(([country]) => country)
  }
};

function postViews(start) {
  return `
    SELECT ${PATH} AS path, count() AS views, uniq(person_id) AS visitor_count
    FROM events
    WHERE event = '$pageview' AND ${scope(start)} AND properties.$pathname ILIKE '/posts/%'
    GROUP BY path`;
}

// ─── Shaping helpers ─────────────────────────────────────────────────────────

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/*
  "Browser, system" as PostHog names them, shortened where PostHog repeats
  itself ("Chrome iOS" on iOS) or is long-winded ("Mac OS X").
*/
export function deviceName(browser, os) {
  const system = os === "Mac OS X" ? "Mac" : os;
  return `${browser.endsWith(` ${os}`) ? browser.slice(0, -os.length - 1) : browser}, ${system}`;
}

const LANGUAGES = new Intl.DisplayNames(["en"], { type: "language" });

/** An English name for a language code, or the code itself if unknown. */
export function languageName(code) {
  try {
    return LANGUAGES.of(code);
  } catch {
    return code;
  }
}

/*
  Post rankings for the slope chart. Rows are already grouped by normalised
  path; only paths that are a real post (or gig review, when included) are
  kept, so typo URLs and indexes drop out. Top 9, the chart's row count.
*/
export const SLOPE_ROWS = 9;

export function rankPosts(rows, index, withGigs) {
  const ranked = rows
    .map(([path, views, visitors]) => ({ page: index.get(normalisePath(path)), views, visitors }))
    .filter(({ page }) => page && (page.kind === "post" || (withGigs && page.kind === "gig")))
    .sort((a, b) => a.page.title.localeCompare(b.page.title))
    .map(({ page, views, visitors }) => ({ title: page.title, views, visitors }));
  return mergeRows(ranked, "title", "views", SLOPE_ROWS);
}

/*
  The five referrer groups, from PostHog's own channel type plus whether the
  referring domain is this site. Detail lists the domains, most first, with a
  count when more than one visitor came from it.
*/
const REFERRER_GROUPS = [
  { group: "Direct", detail: "no referrer" },
  { group: "Internal", detail: "moving around the site" },
  { group: "Search" },
  { group: "Shared links" },
  { group: "Other" }
];

export function referrerGroup(channel, domain) {
  if (!domain || domain === "$direct") return "Direct";
  if (domain === SITE_HOST) return "Internal";
  if (/search/i.test(channel ?? "")) return "Search";
  if (/social|email/i.test(channel ?? "")) return "Shared links";
  return "Other";
}

export function groupReferrers(rows) {
  const groups = REFERRER_GROUPS.map((g) => ({ ...g, visitors: 0, domains: [] }));
  for (const [channel, domain, visitors] of rows) {
    const g = groups.find((x) => x.group === referrerGroup(channel, domain));
    g.visitors += visitors;
    if (!g.detail) g.domains.push(visitors > 1 ? `${domain.replace(/^www\./, "")} ${visitors}` : domain.replace(/^www\./, ""));
  }
  return groups.map(({ group, detail, domains, visitors }) => ({ group, detail: detail ?? domains.join(", "), visitors }));
}

// ─── Putting it together ─────────────────────────────────────────────────────

/**
 * Runs every query through `run(sql)` and returns a snapshot in the shape
 * the page renders from (see tests/fixtures/site-stats-sample.json).
 * `pages` is the site's own page list, `[{ path, title, kind }]`.
 */
export async function fetchSnapshot({ run, now, pages }) {
  const period = periodFor(now);
  const index = pageIndex(pages);
  const results = {};
  // One at a time: PostHog rate-limits the query API per project.
  for (const [name, query] of Object.entries(QUERIES)) {
    results[name] = await run(query.sql(period).trim());
  }
  const shaped = (name) => QUERIES[name].shape(results[name], { period, index });
  const { humanViews, heavyReaderViews, ...funnel } = shaped("funnel");

  return {
    generatedAt: period.generatedAt,
    timezone: TIMEZONE,
    periodDays: period.periodDays,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    totals: { ...shaped("totals"), themeCountries: shaped("themeCountries") },
    funnel: { ...funnel, flaggedReasons: shaped("flaggedReasons") },
    audiences: { compare: shaped("compare"), depth: shaped("depth"), humanViews, heavyReaderViews },
    countries: shaped("countries"),
    cities: shaped("cities"),
    devices: shaped("devices"),
    windowWidths: shaped("windowWidths"),
    languages: shaped("languages"),
    weekly: shaped("weekly"),
    heatmap: shaped("heatmap"),
    posts: {
      recent90: rankPosts(results.postsRecent, index, false),
      allTime: rankPosts(results.postsAllTime, index, false),
      recent90WithGigs: rankPosts(results.postsRecent, index, true),
      allTimeWithGigs: rankPosts(results.postsAllTime, index, true)
    },
    landing: shaped("landing"),
    exits: shaped("exits"),
    transitions: shaped("transitions"),
    referrers: shaped("referrers"),
    returns: shaped("returns"),
    outbound: shaped("outbound"),
    notFound: shaped("notFound")
  };
}
