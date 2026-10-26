import { readFileSync } from "node:fs";
import { expect } from "chai";
import {
  formatInt, formatSeconds, formatValue, pct, minLength, formatAsOf, formatRange, truncate,
  header, dotGrid, real, topNotFound, tiles, compare, stack, depth, mirror, cities, widths,
  bars, isPartialWeek, niceCeil, weekly, heatmap, slope, reading, landing, exits,
  transitions, referrers, returns, signals, siteStatsView
} from "../../lib/site-stats.mjs";

const FIXTURE = JSON.parse(readFileSync(new URL("../fixtures/site-stats-sample.json", import.meta.url), "utf8"));
const sample = () => structuredClone(FIXTURE);

describe("site-stats — formatting", () => {
  it("formats integers with a thousands separator", () => {
    expect(formatInt(1097)).to.equal("1,097");
    expect(formatInt(5)).to.equal("5");
  });

  it("formats seconds under a minute as N s, otherwise M min S s", () => {
    expect(formatSeconds(0)).to.equal("0 s");
    expect(formatSeconds(5)).to.equal("5 s");
    expect(formatSeconds(63)).to.equal("1 min 3 s");
    expect(formatSeconds(416)).to.equal("6 min 56 s");
  });

  it("formats each comparison format", () => {
    expect(formatValue(193, "int")).to.equal("193");
    expect(formatValue(3.5, "2dp")).to.equal("3.50");
    expect(formatValue(34.7, "percent")).to.equal("34.7%");
    expect(formatValue(99, "percent")).to.equal("99.0%");
    expect(formatValue(416, "seconds")).to.equal("6 min 56 s");
  });

  it("rounds percentages to one decimal place, and is 0 against a 0 max", () => {
    expect(pct(66, 448)).to.equal(14.7);
    expect(pct(3, 0)).to.equal(0);
  });

  it("keeps non-zero lengths at a minimum, and zero at zero", () => {
    expect(minLength(0.2, 1)).to.equal(1);
    expect(minLength(5, 1)).to.equal(5);
    expect(minLength(0, 1)).to.equal(0);
  });

  it("formats the data time in NZ, with the zone name", () => {
    expect(formatAsOf("2026-10-25T17:02:00Z")).to.equal("Mon 26 Oct 2026, 6:02 am NZDT");
    expect(formatAsOf("2026-06-30T23:30:00Z")).to.equal("Wed 1 Jul 2026, 11:30 am NZST");
  });

  it("formats a date range, naming both years only when they differ", () => {
    expect(formatRange("2026-04-29", "2026-10-26")).to.equal("29 Apr – 26 Oct 2026");
    expect(formatRange("2025-12-29", "2026-06-26")).to.equal("29 Dec 2025 – 26 Jun 2026");
  });

  it("truncates long titles with an ellipsis", () => {
    expect(truncate("Generosity is a Customer Experience Superpower", 32)).to.equal("Generosity is a Customer Experi…");
    expect(truncate("Short", 32)).to.equal("Short");
  });
});

describe("site-stats — header and Is it real?", () => {
  it("describes when and what period the data covers", () => {
    expect(header(sample())).to.deep.equal({
      periodDays: 180,
      asOf: "Mon 26 Oct 2026, 6:02 am NZDT",
      covers: "29 Apr – 26 Oct 2026 (180 days)"
    });
  });

  it("lays dots out on a grid that fits them exactly", () => {
    const grid = dotGrid(["a", "b", "c"], 2, 17, 12);
    expect(grid.width).to.equal(29);
    expect(grid.height).to.equal(29);
    expect(grid.dots.map((d) => [d.kind, d.cx, d.cy])).to.deep.equal([["a", 6, 6], ["b", 23, 6], ["c", 6, 23]]);
  });

  it("still has a non-zero viewBox with no dots", () => {
    expect(dotGrid([], 30, 17, 12)).to.deep.equal({ width: 12, height: 12, dots: [] });
  });

  it("states the funnel from the data, people first in the dot field", () => {
    const r = real(sample());
    expect(r.heading).to.equal("448 visitors. About 36 were people.");
    expect(r.flagged).to.deep.equal({ n: "66", width: 14.7 });
    expect(r.inferred).to.deep.equal({ n: "346", width: 77.2, medianVisit: "0 seconds" });
    expect(r.people).to.deep.equal({ n: "36", width: 8 });
    expect(r.label).to.equal("448 visitors: 36 looked like people, 346 probably automated by our inference, 66 flagged as bots by PostHog");
    expect(r.field.dots).to.have.length(448);
    expect(r.field.dots[0].kind).to.equal("people");
    expect(r.field.dots[36].kind).to.equal("inferred");
    expect(r.field.dots.at(-1).kind).to.equal("flagged");
  });

  it("says 1 second, singular", () => {
    const s = sample();
    s.funnel.inferredMedianSeconds = 1;
    expect(real(s).inferred.medianVisit).to.equal("1 second");
  });

  it("picks the most-hit not-found path, first on a tie, or nothing", () => {
    expect(topNotFound([{ path: "/contact", hits: 3 }, { path: "/GigTracker/", hits: 2 }])).to.equal("/contact ×3");
    expect(topNotFound([{ path: "/a", hits: 2 }, { path: "/b", hits: 2 }])).to.equal("/a ×2");
    expect(topNotFound([{ path: "/a", hits: 1 }, { path: "/b", hits: 4 }])).to.equal("/b ×4");
    expect(topNotFound([])).to.equal("");
  });

  it("builds the six raw-total tiles", () => {
    expect(tiles(sample()).map((t) => [t.label, t.value, t.note, t.kind])).to.deep.equal([
      ["Visitors", "448", "About 36 people.", "noise"],
      ["Page views", "1,097", "Includes automated.", "noise"],
      ["Bot-flagged visits", "68", "PostHog identified.", "noise"],
      ["Outbound link clicks", "15", "", "real"],
      ["Theme toggles", "33", "By 4 people.", "real"],
      ["Not-found hits", "5", "/contact ×3", "real"]
    ]);
  });

  it("says 1 person, singular", () => {
    const s = sample();
    s.totals.themeTogglePeople = 1;
    expect(tiles(s)[4].note).to.equal("By 1 person.");
  });
});

describe("site-stats — two audiences", () => {
  it("scales each comparison row to its own max, never below a sliver", () => {
    const rows = compare(sample());
    expect(rows[0]).to.deep.equal({ measure: "Sessions", left: "193", right: "351", leftWidth: 55, rightWidth: 100 });
    expect(rows[3]).to.include({ left: "5 s", right: "0 s", leftWidth: 100, rightWidth: 1 });
    expect(rows[4]).to.include({ left: "6 min 56 s", right: "1 min 3 s" });
  });

  it("draws a sliver for both sides when both are zero", () => {
    const s = sample();
    s.audiences.compare = [{ measure: "M", nzau: 0, rest: 0, format: "int" }];
    expect(compare(s)[0]).to.include({ leftWidth: 1, rightWidth: 1 });
  });

  it("stacks segments to fill 100, with gaps and a minimum width", () => {
    const segs = stack([346, 2, 2, 0], 0.4, 0.6);
    expect(segs.map((s) => s.width)).to.deep.equal([98, 0.6, 0.6, 0]);
    expect(segs[1].x).to.equal(98.4);
    expect(stack([0, 0], 0.4, 0.6)).to.deep.equal([{ x: 0, width: 0 }, { x: 0, width: 0 }]);
  });

  it("builds the depth bars and the heavy-reader line", () => {
    const d = depth(sample());
    expect(d.groups[0]).to.include({ name: "NZ & Australia", total: "32" });
    expect(d.groups[0].label).to.equal("NZ & Australia, pages viewed per visitor: 1 page 17, 2–3 6, 4–9 3, 10+ 6");
    expect(d.groups[0].segments.map((s) => s.kind)).to.deep.equal(["noise-faint", "real-low", "real-mid", "real"]);
    expect(d).to.include({ heavyReaders: "6", heavyViews: "632", mostOf: true });
  });

  it("drops 'most of' when heavy readers are not over half of human views", () => {
    const s = sample();
    s.audiences.humanViews = 1264;
    expect(depth(s).mostOf).to.equal(false);
  });

  it("mirrors visitors against views on one shared scale, with a multiplier", () => {
    const rows = mirror(sample().countries);
    const nz = rows.find((r) => r.name === "New Zealand");
    expect(nz).to.deep.equal({ name: "New Zealand", visitors: "17", views: "663", visitorsWidth: 2.6, viewsWidth: 100, multiplier: "×39", read: true });
    expect(rows[0]).to.include({ multiplier: "×1", read: false });
  });

  it("handles a visitor-less row", () => {
    expect(mirror([{ name: "X", visitors: 0, views: 0 }])[0]).to.include({ multiplier: "×0", read: false, viewsWidth: 0 });
  });

  it("names cities with their country code, or tags them city unknown", () => {
    const rows = cities(sample());
    expect(rows[0]).to.deep.equal({ name: "Singapore", unknown: true, home: false, n: "37", width: 100 });
    expect(rows.find((r) => r.name === "Auckland, NZ")).to.include({ unknown: false, home: true });
  });

  it("draws window-width columns with the widest bucket called out", () => {
    const w = widths(sample());
    expect(w.wide).to.equal("246");
    expect(w.columns).to.have.length(5);
    expect(w.columns[4]).to.include({ n: "246", height: 130, y: 24 });
    expect(w.columns[1].height).to.equal(2);
    expect(w.label).to.equal("Visitors by window width: <500 40, 500–767 1, 768–1099 4, 1100–1499 91, 1500+ 246");
  });

  it("copes with no window-width data", () => {
    const s = sample();
    s.windowWidths = [];
    expect(widths(s)).to.include({ wide: "0" });
    s.windowWidths = [{ label: "<500", visitors: 0 }];
    expect(widths(s).columns[0]).to.include({ height: 0, y: 154 });
  });

  it("scales a bar list to its own max", () => {
    expect(bars([{ name: "English", visitors: 291 }, { name: "Japanese", visitors: 1 }], "visitors", "name"))
      .to.deep.equal([{ name: "English", n: "291", width: 100 }, { name: "Japanese", n: "1", width: 0.5 }]);
  });
});

describe("site-stats — over time", () => {
  it("treats a week starting within 7 days of the data time as in progress", () => {
    const at = "2026-10-25T17:02:00Z"; // Mon 26 Oct in NZ
    expect(isPartialWeek("2026-10-26", at)).to.equal(true);
    expect(isPartialWeek("2026-10-19", at)).to.equal(false);
    expect(isPartialWeek("2026-10-19", "2026-10-25T10:00:00Z")).to.equal(true); // Sun 25 Oct in NZ
  });

  it("rounds a scale up to a tidy number", () => {
    expect(niceCeil(3)).to.equal(10);
    expect(niceCeil(40)).to.equal(40);
    expect(niceCeil(43)).to.equal(45);
    expect(niceCeil(120)).to.equal(150);
  });

  it("draws the weekly totals, labelling big and partial weeks", () => {
    const w = weekly(sample());
    expect(w.columns).to.have.length(27);
    expect(w.columns[0]).to.include({ tick: "27 Apr", total: "" });
    expect(w.columns[1].tick).to.equal("");
    expect(w.columns[14]).to.include({ total: "104", partial: false });
    expect(w.columns[26]).to.include({ total: "10", partial: true });
    expect(w).to.include({ partialWeek: "26 Oct", scale: "40", weekCount: 27 });
    expect(w.months).to.deep.equal(["Apr", "Jul", "Oct"]);
    expect(w.label).to.equal("Weekly page views, 27 weeks from 27 Apr, peak 121");
  });

  it("puts every section panel on one shared scale", () => {
    const w = weekly(sample());
    expect(w.panels.map((p) => p.kind)).to.deep.equal(["music", "orchestra", "comedy", "theatre", "opera", "other"]);
    const apps = w.panels[4];
    expect(apps).to.include({ name: "Apps", total: "188", label: "Apps views per week, peak 40" });
    expect(apps.bars[16]).to.include({ height: 100, y: 0 });
    expect(apps.bars[26]).to.include({ partial: true, hidden: false });
    expect(w.panels[0].bars[26]).to.include({ partial: false, hidden: true });
  });

  it("has no in-progress week when the data is a week old", () => {
    const s = sample();
    s.generatedAt = "2026-11-05T00:00:00Z";
    expect(weekly(s).partialWeek).to.equal("");
  });

  it("shades the heatmap by the square root of views, empty at zero", () => {
    const h = heatmap(sample());
    expect(h.hours[0]).to.deep.equal({ hour: 0, label: "midnight" });
    expect(h.hours[1].label).to.equal("");
    expect(h.days[1].cells[23]).to.deep.equal({ v: 35, opacity: 1, label: "Tue 23:00, 35 views" });
    expect(h.days[0].cells[1]).to.include({ v: 1, label: "Mon 01:00, 1 view" });
    expect(h.days[0].cells[2]).to.include({ v: 0, opacity: 0 });
    expect(h.days[0]).to.include({ day: "Mon", total: "193" });
  });
});

describe("site-stats — what's read", () => {
  const all = [{ title: "A", views: 9 }, { title: "B", views: 8 }, { title: "C", views: 7 }, { title: "D", views: 6 }];
  const recent = [{ title: "C", views: 5 }, { title: "A", views: 4 }, { title: "New", views: 3 }, { title: "D", views: 2 }, { title: "B", views: 1 }];

  it("classifies each post's movement between the two rankings", () => {
    const s = slope(all, recent);
    expect(s.right.map((r) => [r.title, r.move, r.isNew])).to.deep.equal([
      ["C", "rising", false], ["A", "steady", false], ["New", "steady", true], ["D", "steady", false], ["B", "falling", false]
    ]);
    expect(s.left.map((r) => r.move)).to.deep.equal(["steady", "falling", "rising", "steady"]);
    expect(s.height).to.equal(260);
  });

  it("joins ranks with lines and gives a new post a dashed stub", () => {
    const s = slope(all, recent);
    expect(s.lines[0]).to.deep.equal({ x1: 320, y1: 140, x2: 460, y2: 60, move: "rising", stub: false });
    expect(s.lines[2]).to.deep.equal({ x1: 410, y1: 140, x2: 460, y2: 140, move: "steady", stub: true });
  });

  it("is empty when either ranking is missing", () => {
    expect(slope(null, recent)).to.equal(null);
    expect(slope(all, [])).to.equal(null);
  });

  it("builds both slope charts, gig-inclusive empty in the sample", () => {
    const r = reading(sample());
    expect(r.withoutGigs.left[0]).to.include({ title: "Last Ever Last Ever", views: "81" });
    expect(r.withGigs).to.equal(null);
  });

  it("splits landing bars into single-page and continued sessions", () => {
    const rows = landing(sample());
    expect(rows[0]).to.deep.equal({
      name: "Home", sessions: "260", singleWidth: 66.5, moreX: 66.5, moreWidth: 33.5, left: "67%",
      label: "Home: 260 sessions, 173 single-page"
    });
  });

  it("copes with a landing page with no sessions", () => {
    const s = sample();
    s.landing = [{ page: "X", sessions: 0, singlePage: 0 }];
    expect(landing(s)[0]).to.include({ left: "0%", singleWidth: 0, moreWidth: 0 });
  });

  it("marks the top exit page", () => {
    const rows = exits(sample());
    expect(rows[0]).to.deep.equal({ name: "Gig History app", n: "43", width: 100, top: true });
    expect(rows[1].top).to.equal(false);
  });

  it("shades transitions linearly and flips text on dark cells", () => {
    const t = transitions(sample());
    expect(t.sections).to.have.length(5);
    expect(t.rows[0].cells[4]).to.deep.equal({ n: "56", opacity: 1, onAccent: true, same: false, label: "Home to App: 56 moves" });
    expect(t.rows[3].cells[3]).to.include({ n: "0", opacity: 0, onAccent: false, same: true });
    expect(t.rows[2].cells[4]).to.include({ opacity: 0.18, onAccent: false });
  });
});

describe("site-stats — arrivals and small signals", () => {
  it("gives the no-referrer share and the stacked bar", () => {
    const r = referrers(sample());
    expect(r.directShare).to.equal("91%");
    expect(r.rows.map((x) => x.kind)).to.deep.equal(["noise", "noise-faint", "real-mid", "real", "real-low"]);
    expect(r.label).to.equal("Visitors by source: 351 direct, 22 internal, 6 search, 6 shared links, 2 other");
  });

  it("is 0% with no Direct group", () => {
    const s = sample();
    s.referrers = [{ group: "Other", detail: "", visitors: 3 }];
    expect(referrers(s).directShare).to.equal("0%");
  });

  it("counts returners and orders the dots most loyal first", () => {
    const r = returns(sample());
    expect(r).to.include({ cameBack: "8", fivePlus: "5" });
    expect(r.field.dots).to.have.length(382);
    expect(r.field.dots[0].kind).to.equal("real");
    expect(r.field.dots.at(-1).kind).to.equal("once");
    expect(r.legend[0]).to.deep.equal({ label: "1 day", n: "374", kind: "once" });
  });

  it("copes with missing return buckets", () => {
    const s = sample();
    s.returns = [];
    expect(returns(s)).to.include({ cameBack: "0", fivePlus: "0" });
  });

  it("summarises outbound clicks, not-found paths and theme toggles", () => {
    const sig = signals(sample());
    expect(sig.outbound.rows[0]).to.deep.equal({ name: "Flickr", n: 3, units: [1, 1, 1] });
    expect(sig.notFound.rows).to.deep.equal([{ path: "/contact", n: "3" }, { path: "/GigTracker/", n: "2" }]);
    expect(sig.theme).to.include({
      total: "33", summary: "4 people, average 8 toggles each", countries: "New Zealand, Australia", label: "33 toggles by 4 people"
    });
    expect(sig.theme.people).to.have.length(4);
  });

  it("copes with no toggles and no toggle countries", () => {
    const s = sample();
    Object.assign(s.totals, { themeToggles: 0, themeTogglePeople: 0 });
    delete s.totals.themeCountries;
    expect(signals(s).theme).to.include({ summary: "0 people, average 0 toggles each", countries: "" });
  });
});

describe("site-stats — siteStatsView", () => {
  it("assembles every section", () => {
    expect(Object.keys(siteStatsView(sample()))).to.deep.equal([
      "header", "real", "tiles", "compare", "depth", "countries", "cities", "devices", "widths", "languages",
      "weekly", "heatmap", "reading", "landing", "exits", "transitions", "referrers", "returns", "signals"
    ]);
  });
});
