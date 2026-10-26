import { expect } from "chai";
import {
  nzDate, addDays, mondayOf, periodFor, normalisePath, pageIndex, mergeRows,
  sectionOf, pageLabel, deviceName, languageName, rankPosts, referrerGroup,
  groupReferrers, fetchSnapshot, QUERIES, SITE_HOST, ALL_TIME_START
} from "../../lib/site-stats-fetch.mjs";

const PAGES = [
  { path: "/", title: "Home", kind: "home" },
  { path: "/gigs/", title: "Gigs index", kind: "index" },
  { path: "/posts/Last-Ever-Last-Ever/", title: "Last Ever Last Ever", kind: "post" },
  { path: "/posts/Already-Not-Dating-Her/", title: "You're Already Not Dating Her", kind: "post" },
  { path: "/posts/gigs/20250316-Shihad-Wellington/", title: "Shihad @ Meow Nui, Wellington", kind: "gig" },
  { path: "/posts/gigs/20250316-Shihad/", title: "Redirecting…", kind: "gig", redirectTo: "/posts/gigs/20250316-Shihad-Wellington/" },
  { path: "/posts/gigs/Gone/", title: "Redirecting…", kind: "gig", redirectTo: "/posts/gigs/Nowhere/" },
  { path: "/Gig-History/", title: "Gig History", kind: "app" }
];
const INDEX = pageIndex(PAGES);
const NOW = new Date("2026-10-25T17:02:00Z"); // 6:02 am, Mon 26 Oct in NZ

describe("site-stats-fetch — dates", () => {
  it("gives the NZ calendar date, which can be a day ahead of UTC", () => {
    expect(nzDate(NOW)).to.equal("2026-10-26");
  });

  it("adds and subtracts days across month ends", () => {
    expect(addDays("2026-10-26", -179)).to.equal("2026-04-30");
    expect(addDays("2026-02-28", 1)).to.equal("2026-03-01");
  });

  it("finds the Monday on or before a date", () => {
    expect(mondayOf("2026-10-26")).to.equal("2026-10-26");
    expect(mondayOf("2026-10-25")).to.equal("2026-10-19");
    expect(mondayOf("2026-04-30")).to.equal("2026-04-27");
  });

  it("builds a 180-day window and a 90-day recent window ending today in NZ", () => {
    expect(periodFor(NOW)).to.deep.equal({
      generatedAt: "2026-10-25T17:02:00.000Z",
      periodDays: 180,
      periodStart: "2026-04-30",
      periodEnd: "2026-10-26",
      recentStart: "2026-07-29"
    });
  });
});

describe("site-stats-fetch — pages and sections", () => {
  it("folds case, underscores and a missing trailing slash", () => {
    expect(normalisePath("/posts/Already_Not_Dating_Her")).to.equal("/posts/already-not-dating-her/");
    expect(normalisePath("/")).to.equal("/");
  });

  it("indexes a redirect stub as its target, and drops one with no target", () => {
    expect(INDEX.get("/posts/gigs/20250316-shihad/").title).to.equal("Shihad @ Meow Nui, Wellington");
    expect(INDEX.has("/posts/gigs/gone/")).to.equal(false);
  });

  it("sorts paths into the six sections", () => {
    expect(sectionOf("/", INDEX)).to.equal(0);
    expect(sectionOf("/posts/Anything/", INDEX)).to.equal(1);
    expect(sectionOf("/posts/gigs/x/", INDEX)).to.equal(2);
    expect(sectionOf("/gigs/", INDEX)).to.equal(3);
    expect(sectionOf("/apps/", INDEX)).to.equal(4);
    expect(sectionOf("/Gig-History/", INDEX)).to.equal(4);
    expect(sectionOf("/contact", INDEX)).to.equal(5);
  });

  it("labels pages by title, gigs and apps distinctly, unknown paths as themselves", () => {
    expect(pageLabel("/", INDEX)).to.equal("Home");
    expect(pageLabel("/posts/gigs/20250316-shihad-wellington/", INDEX)).to.equal("Gig: Shihad @ Meow Nui, Wellington");
    expect(pageLabel("/gig-history/", INDEX)).to.equal("Gig History app");
    expect(pageLabel("/contact/", INDEX)).to.equal("/contact/");
  });
});

describe("site-stats-fetch — shaping helpers", () => {
  it("merges rows by label, sums the rest, and keeps the top N", () => {
    const rows = [
      { page: "A", sessions: 3, single: 1 },
      { page: "B", sessions: 5, single: 0 },
      { page: "A", sessions: 4, single: 2 },
      { page: "C", sessions: 1, single: 1 }
    ];
    expect(mergeRows(rows, "page", "sessions", 2)).to.deep.equal([
      { page: "A", sessions: 7, single: 3 },
      { page: "B", sessions: 5, single: 0 }
    ]);
  });

  it("names devices without repeating the system or using long OS names", () => {
    expect(deviceName("Chrome iOS", "iOS")).to.equal("Chrome, iOS");
    expect(deviceName("Chrome", "Mac OS X")).to.equal("Chrome, Mac");
    expect(deviceName("Mobile Safari", "iOS")).to.equal("Mobile Safari, iOS");
  });

  it("names languages in English, falling back to the code", () => {
    expect(languageName("zh")).to.equal("Chinese");
    expect(languageName("!!")).to.equal("!!");
  });

  it("ranks posts, merging old URLs, dropping non-posts and optionally gigs", () => {
    const rows = [
      ["/posts/last-ever-last-ever/", 10, 6],
      ["/posts/already-not-dating-her/", 4, 3],
      ["/posts/gigs/20250316-shihad/", 9, 9],
      ["/posts/gigs/20250316-shihad-wellington/", 3, 2],
      ["/posts/typo/", 50, 50],
      ["/gigs/", 99, 9]
    ];
    expect(rankPosts(rows, INDEX, false)).to.deep.equal([
      { title: "Last Ever Last Ever", views: 10, visitors: 6 },
      { title: "You're Already Not Dating Her", views: 4, visitors: 3 }
    ]);
    expect(rankPosts(rows, INDEX, true).map((p) => [p.title, p.views])).to.deep.equal([
      ["Shihad @ Meow Nui, Wellington", 12],
      ["Last Ever Last Ever", 10],
      ["You're Already Not Dating Her", 4]
    ]);
  });

  it("groups referrers by channel and domain", () => {
    expect(referrerGroup("Direct", "$direct")).to.equal("Direct");
    expect(referrerGroup("Referral", null)).to.equal("Direct");
    expect(referrerGroup("Referral", SITE_HOST)).to.equal("Internal");
    expect(referrerGroup("Organic Search", "www.google.com")).to.equal("Search");
    expect(referrerGroup("Organic Social", "t.co")).to.equal("Shared links");
    expect(referrerGroup("Email", "com.google.android.gm")).to.equal("Shared links");
    expect(referrerGroup("Referral", "github.com")).to.equal("Other");
    expect(referrerGroup(null, "github.com")).to.equal("Other");
  });

  it("lists referrer domains with counts above one, keeping fixed details", () => {
    expect(groupReferrers([
      ["Direct", "$direct", 10],
      ["Organic Search", "www.google.com", 2],
      ["Organic Search", "bing.com", 1]
    ])).to.deep.equal([
      { group: "Direct", detail: "no referrer", visitors: 10 },
      { group: "Internal", detail: "moving around the site", visitors: 0 },
      { group: "Search", detail: "google.com 2, bing.com", visitors: 3 },
      { group: "Shared links", detail: "", visitors: 0 },
      { group: "Other", detail: "", visitors: 0 }
    ]);
  });
});

describe("site-stats-fetch — queries", () => {
  const period = periodFor(NOW);

  it("bounds every query by the production host and excludes internal traffic", () => {
    for (const [name, query] of Object.entries(QUERIES)) {
      const sql = query.sql(period);
      expect(sql, name).to.include(`properties.$host = '${SITE_HOST}'`);
      expect(sql, name).to.include("coalesce(properties.internal_user, false) != true");
    }
  });

  it("uses the 90-day window for recent posts and all time for the all-time ranking", () => {
    expect(QUERIES.postsRecent.sql(period)).to.include("toDateTime('2026-07-29 00:00:00'");
    expect(QUERIES.postsAllTime.sql(period)).to.include(`toDateTime('${ALL_TIME_START} 00:00:00'`);
  });

  it("starts the weekly query on the Monday of the first week", () => {
    expect(QUERIES.weekly.sql(period)).to.include("toDateTime('2026-04-27 00:00:00'");
  });
});

/*
  Canned PostHog rows, in SELECT order, for every query. Run through
  fetchSnapshot to check the whole snapshot shape end to end.
*/
const ROWS = {
  totals: [[1097, 448, 15, 33, 4, 5, 68]],
  funnel: [[448, 66, 346, 36, 6, 5, null, 700, 632]],
  flaggedReasons: [["Sogou", 5]],
  compare: [[true, 193, 681, 67, 5, 416.4], [false, 351, 358, 348, 0, 62.6]],
  depth: [[true, 0, 17], [true, 3, 6], [false, 1, 2]],
  countries: [["New Zealand", 17, 663]],
  cities: [[null, "SG", "Singapore", 37], ["Auckland", "NZ", "New Zealand", 11]],
  devices: [["Chrome iOS", "iOS", 11, 300], ["Chrome", "iOS", 1, 68], ["Chrome", "Windows", 246, 259]],
  windowWidths: [[0, 40], [4, 246]],
  languages: [["en", 291]],
  weekly: [["2026-04-27", "/", 24], ["2026-04-27", "/posts/gigs/x/", 3], ["2026-10-26", "/gig-history/", 1], ["2026-01-05", "/", 99]],
  heatmap: [[1, 23, 33], [7, 0, 20]],
  postsRecent: [["/posts/last-ever-last-ever/", 31, 25]],
  postsAllTime: [["/posts/last-ever-last-ever/", 81, 41], ["/posts/gigs/20250316-shihad-wellington/", 40, 30]],
  landing: [["/", 260, 173], ["/posts/gigs/20250316-shihad/", 20, 20], ["/posts/gigs/20250316-shihad-wellington/", 8, 8]],
  exits: [["/gig-history/", 43]],
  transitions: [["/", "/posts/x/", 33], ["/", "/", 47], ["/contact/", "/", 3], ["/", "/apps/", 5]],
  referrers: [["Direct", "$direct", 351]],
  returns: [[0, 374], [3, 5]],
  outbound: [["flickr.com", 3]],
  notFound: [["/contact", 3]],
  themeCountries: [["New Zealand"], ["Australia"]]
};

describe("site-stats-fetch — fetchSnapshot", () => {
  let snapshot;
  const asked = [];

  before(async () => {
    const period = periodFor(NOW);
    const byQuery = new Map(Object.entries(QUERIES).map(([name, q]) => [q.sql(period).trim(), ROWS[name]]));
    snapshot = await fetchSnapshot({
      now: NOW,
      pages: PAGES,
      run: async (sql) => { asked.push(sql); return byQuery.get(sql); }
    });
  });

  it("runs every query exactly once", () => {
    expect(asked).to.have.length(Object.keys(QUERIES).length);
  });

  it("records when and over what window", () => {
    expect(snapshot).to.include({ generatedAt: "2026-10-25T17:02:00.000Z", timezone: "Pacific/Auckland", periodDays: 180, periodStart: "2026-04-30", periodEnd: "2026-10-26" });
  });

  it("shapes totals and the funnel, with a null median as 0", () => {
    expect(snapshot.totals).to.deep.equal({
      pageViews: 1097, visitors: 448, outboundClicks: 15, themeToggles: 33, themeTogglePeople: 4,
      notFoundHits: 5, botFlaggedVisits: 68, themeCountries: ["New Zealand", "Australia"]
    });
    expect(snapshot.funnel).to.deep.equal({
      reported: 448, flaggedByPostHog: 66, inferredAutomated: 346, people: 36, viewed10Plus: 6,
      returned5PlusDays: 5, inferredMedianSeconds: 0, flaggedReasons: [{ label: "Sogou", visits: 5 }]
    });
  });

  it("compares the two audiences with rounded measures", () => {
    expect(snapshot.audiences.compare).to.deep.equal([
      { measure: "Sessions", nzau: 193, rest: 351, format: "int" },
      { measure: "Pages per session", nzau: 3.53, rest: 1.02, format: "2dp" },
      { measure: "Single-page sessions", nzau: 34.7, rest: 99.1, format: "percent" },
      { measure: "Median time on site", nzau: 5, rest: 0, format: "seconds" },
      { measure: "Average time, multi-page sessions", nzau: 416, rest: 63, format: "seconds" }
    ]);
    expect(snapshot.audiences.depth).to.deep.equal({ buckets: ["1 page", "2–3", "4–9", "10+"], nzau: [17, 0, 0, 6], rest: [0, 2, 0, 0] });
    expect(snapshot.audiences).to.include({ humanViews: 700, heavyReaderViews: 632 });
  });

  it("fills an audience with no sessions with zeros", async () => {
    const shaped = QUERIES.compare.shape([[true, 0, 0, 0, null, null]]);
    expect(shaped.map((r) => [r.nzau, r.rest])).to.deep.equal([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]);
  });

  it("shapes the breakdowns", () => {
    expect(snapshot.countries).to.deep.equal([{ name: "New Zealand", visitors: 17, views: 663 }]);
    expect(snapshot.cities[0]).to.deep.equal({ city: null, countryCode: "SG", country: "Singapore", visitors: 37 });
    expect(snapshot.devices).to.deep.equal([
      { name: "Chrome, Windows", visitors: 246, views: 259 },
      { name: "Chrome, iOS", visitors: 12, views: 368 }
    ]);
    expect(snapshot.windowWidths.map((w) => w.visitors)).to.deep.equal([40, 0, 0, 0, 246]);
    expect(snapshot.languages).to.deep.equal([{ name: "English", visitors: 291 }]);
  });

  it("buckets weekly views by section, ignoring weeks outside the window", () => {
    const { sections, weeks } = snapshot.weekly;
    expect(sections).to.have.length(6);
    expect(weeks).to.have.length(27);
    expect(weeks[0]).to.deep.equal({ weekOf: "2026-04-27", views: [24, 0, 3, 0, 0, 0] });
    expect(weeks.at(-1)).to.deep.equal({ weekOf: "2026-10-26", views: [0, 0, 0, 0, 1, 0] });
  });

  it("places heatmap counts by weekday (Mon first) and hour", () => {
    expect(snapshot.heatmap.views[0][23]).to.equal(33);
    expect(snapshot.heatmap.views[6][0]).to.equal(20);
    expect(snapshot.heatmap.views.flat().reduce((a, b) => a + b)).to.equal(53);
  });

  it("ranks posts with and without gigs", () => {
    expect(snapshot.posts.recent90).to.deep.equal([{ title: "Last Ever Last Ever", views: 31, visitors: 25 }]);
    expect(snapshot.posts.allTimeWithGigs.map((p) => p.title)).to.deep.equal(["Last Ever Last Ever", "Shihad @ Meow Nui, Wellington"]);
  });

  it("merges a renamed page's landings and labels exits", () => {
    expect(snapshot.landing).to.deep.equal([
      { page: "Home", sessions: 260, singlePage: 173 },
      { page: "Gig: Shihad @ Meow Nui, Wellington", sessions: 28, singlePage: 28 }
    ]);
    expect(snapshot.exits).to.deep.equal([{ page: "Gig History app", sessions: 43 }]);
  });

  it("counts moves between the five named sections only", () => {
    expect(snapshot.transitions.counts[0]).to.deep.equal([47, 33, 0, 0, 5]);
    expect(snapshot.transitions.counts.flat().reduce((a, b) => a + b)).to.equal(85);
  });

  it("shapes arrivals, returns and small signals", () => {
    expect(snapshot.referrers[0]).to.deep.equal({ group: "Direct", detail: "no referrer", visitors: 351 });
    expect(snapshot.returns).to.deep.equal([
      { label: "1 day", visitors: 374 }, { label: "2 days", visitors: 0 },
      { label: "3–4 days", visitors: 0 }, { label: "5+ days", visitors: 5 }
    ]);
    expect(snapshot.outbound).to.deep.equal([{ destination: "flickr.com", clicks: 3 }]);
    expect(snapshot.notFound).to.deep.equal([{ path: "/contact", hits: 3 }]);
  });
});
