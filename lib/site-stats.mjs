/*
  Turns a Site Stats snapshot (see lib/site-stats-fetch.mjs) into what the
  /Site-Stats/ templates draw: formatted numbers, bar lengths, SVG
  coordinates and the class names that carry colour.

  Everything a chart needs to size itself is computed here and emitted as SVG
  attributes, never as a style="" attribute, so the page keeps a strict
  style-src CSP (see lib/csp-hash.mjs). Lengths are percentages of a 0–100
  viewBox unless a function says otherwise.

  Copy that contains a number gets the number from the snapshot. Nothing here
  states a finding that could go stale.
*/

const TIMEZONE = "Pacific/Auckland";
const HOME_CODES = ["NZ", "AU"];

// ─── Formatting ──────────────────────────────────────────────────────────────

const INT = new Intl.NumberFormat("en-NZ");

export function formatInt(n) {
  return INT.format(n);
}

/** "5 s" under a minute, otherwise "6 min 56 s". */
export function formatSeconds(seconds) {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function formatValue(value, format) {
  if (format === "2dp") return value.toFixed(2);
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "seconds") return formatSeconds(value);
  return formatInt(value);
}

/** Percentage of `max`, one decimal place; 0 when max is 0. */
export function pct(value, max) {
  return max > 0 ? Math.round((value / max) * 1000) / 10 : 0;
}

/** A bar length that is never drawn thinner than `min`, unless it is zero. */
export function minLength(length, min) {
  return length > 0 ? Math.max(length, min) : 0;
}

function plural(n, word) {
  return `${formatInt(n)} ${word}${n === 1 ? "" : "s"}`;
}

function people(n) {
  return n === 1 ? "1 person" : `${formatInt(n)} people`;
}

/** "Mon 26 Oct 2026, 6:02 am NZDT" for an ISO timestamp, in NZ time. */
export function formatAsOf(iso) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-NZ", {
    timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short"
  }).formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()} ${parts.timeZoneName}`;
}

function dayMonth(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "short", timeZone: "UTC" })}`;
}

/** "29 Apr – 26 Oct 2026", with both years when they differ. */
export function formatRange(start, end) {
  const [startYear, endYear] = [start.slice(0, 4), end.slice(0, 4)];
  const from = startYear === endYear ? dayMonth(start) : `${dayMonth(start)} ${startYear}`;
  return `${from} – ${dayMonth(end)} ${endYear}`;
}

/** "Search engines and long names…" cut to `max` characters with an ellipsis. */
export function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// ─── Header and "Is it real?" ────────────────────────────────────────────────

export function header(s) {
  return {
    periodDays: s.periodDays,
    asOf: formatAsOf(s.generatedAt),
    covers: `${formatRange(s.periodStart, s.periodEnd)} (${s.periodDays} days)`
  };
}

/*
  Lays `kinds` out as dots on a grid `cols` wide, `step` apart, as SVG
  circle centres. The viewBox fits the dots exactly, so the field reflows by
  scaling.
*/
export function dotGrid(kinds, cols, step, size) {
  const rows = Math.max(1, Math.ceil(kinds.length / cols));
  return {
    width: (Math.min(kinds.length, cols) || 1) * step - (step - size),
    height: rows * step - (step - size),
    dots: kinds.map((kind, i) => ({
      kind,
      cx: (i % cols) * step + size / 2,
      cy: Math.floor(i / cols) * step + size / 2
    }))
  };
}

function repeat(kind, n) {
  return Array(n).fill(kind);
}

export function real(s) {
  const f = s.funnel;
  const share = (n) => pct(n, f.reported);
  return {
    heading: `${formatInt(f.reported)} visitors. About ${formatInt(f.people)} were people.`,
    reported: formatInt(f.reported),
    flagged: { n: formatInt(f.flaggedByPostHog), width: share(f.flaggedByPostHog) },
    inferred: {
      n: formatInt(f.inferredAutomated),
      width: share(f.inferredAutomated),
      medianVisit: plural(f.inferredMedianSeconds, "second")
    },
    people: { n: formatInt(f.people), width: minLength(share(f.people), 1) },
    viewed10Plus: formatInt(f.viewed10Plus),
    returned5PlusDays: formatInt(f.returned5PlusDays),
    label: `${formatInt(f.reported)} visitors: ${formatInt(f.people)} looked like people, ` +
      `${formatInt(f.inferredAutomated)} probably automated by our inference, ` +
      `${formatInt(f.flaggedByPostHog)} flagged as bots by PostHog`,
    field: dotGrid([
      ...repeat("people", f.people),
      ...repeat("inferred", f.inferredAutomated),
      ...repeat("flagged", f.flaggedByPostHog)
    ], 30, 17, 12)
  };
}

/** The most-hit not-found path; ties go to the first in the list. */
export function topNotFound(notFound) {
  const top = notFound.reduce((best, row) => (row.hits > best.hits ? row : best), notFound[0] ?? null);
  return top ? `${top.path} ×${top.hits}` : "";
}

export function tiles(s) {
  const t = s.totals;
  return [
    { label: "Visitors", value: formatInt(t.visitors), note: `About ${formatInt(s.funnel.people)} people.`, kind: "noise" },
    { label: "Page views", value: formatInt(t.pageViews), note: "Includes automated.", kind: "noise" },
    { label: "Bot-flagged visits", value: formatInt(t.botFlaggedVisits), note: "PostHog identified.", kind: "noise" },
    { label: "Outbound link clicks", value: formatInt(t.outboundClicks), note: "", kind: "real" },
    { label: "Theme toggles", value: formatInt(t.themeToggles), note: `By ${people(t.themeTogglePeople)}.`, kind: "real" },
    { label: "Not-found hits", value: formatInt(t.notFoundHits), note: topNotFound(s.notFound), kind: "real" }
  ];
}

// ─── Two audiences ───────────────────────────────────────────────────────────

export function compare(s) {
  return s.audiences.compare.map((row) => {
    const max = Math.max(row.nzau, row.rest);
    return {
      measure: row.measure,
      left: formatValue(row.nzau, row.format),
      right: formatValue(row.rest, row.format),
      leftWidth: minLength(pct(row.nzau, max), 1) || 1,
      rightWidth: minLength(pct(row.rest, max), 1) || 1
    };
  });
}

const DEPTH_KINDS = ["noise-faint", "real-low", "real-mid", "real"];

/*
  Segments of a 100%-wide stacked bar, in viewBox units 0–100, with `gap`
  between segments and every non-zero segment at least `min` wide.
*/
export function stack(counts, gap, min) {
  const total = counts.reduce((a, b) => a + b, 0);
  const live = counts.filter((n) => n > 0).length;
  const room = 100 - gap * Math.max(0, live - 1);
  const widths = counts.map((n) => (n > 0 ? Math.max((n / total) * room, min) : 0));
  const scale = room / (widths.reduce((a, b) => a + b, 0) || 1);
  let x = 0;
  return widths.map((w) => {
    const seg = { x: Math.round(x * 100) / 100, width: Math.round(w * scale * 100) / 100 };
    if (w > 0) x += w * scale + gap;
    return seg;
  });
}

export function depth(s) {
  const d = s.audiences.depth;
  const group = (name, counts) => ({
    name,
    total: formatInt(counts.reduce((a, b) => a + b, 0)),
    label: `${name}, pages viewed per visitor: ` + d.buckets.map((b, i) => `${b} ${counts[i]}`).join(", "),
    segments: stack(counts, 0.4, 0.6).map((seg, i) => ({ ...seg, kind: DEPTH_KINDS[i], bucket: d.buckets[i], n: formatInt(counts[i]) }))
  });
  const a = s.audiences;
  return {
    groups: [group("NZ & Australia", d.nzau), group("Rest of world", d.rest)],
    heavyReaders: formatInt(s.funnel.viewed10Plus),
    heavyViews: formatInt(a.heavyReaderViews),
    mostOf: a.heavyReaderViews > a.humanViews / 2
  };
}

/*
  Butterfly rows: visitors to the left, views to the right, both on one
  shared scale. Every row carries its views-per-visitor multiplier; two or
  more marks the row as read by people rather than passed through.
*/
export function mirror(rows) {
  const max = Math.max(0, ...rows.flatMap((r) => [r.visitors, r.views]));
  return rows.map((r) => {
    const ratio = r.visitors > 0 ? Math.round(r.views / r.visitors) : 0;
    return {
      name: r.name,
      visitors: formatInt(r.visitors),
      views: formatInt(r.views),
      visitorsWidth: minLength(pct(r.visitors, max), 0.5),
      viewsWidth: minLength(pct(r.views, max), 0.5),
      multiplier: `×${ratio}`,
      read: ratio >= 2
    };
  });
}

export function cities(s) {
  const max = Math.max(0, ...s.cities.map((c) => c.visitors));
  return s.cities.map((c) => ({
    name: c.city ? `${c.city}, ${c.countryCode}` : c.country,
    unknown: !c.city,
    home: HOME_CODES.includes(c.countryCode),
    n: formatInt(c.visitors),
    width: pct(c.visitors, max)
  }));
}

/*
  The window-width columns as one SVG, 380 units wide: column rects plus
  their counts above and labels below.
*/
export function widths(s) {
  const rows = s.windowWidths;
  const max = Math.max(0, ...rows.map((r) => r.visitors));
  const colWidth = 380 / rows.length;
  const plot = 130;
  return {
    wide: formatInt(rows.at(-1)?.visitors ?? 0),
    label: "Visitors by window width: " + rows.map((r) => `${r.label} ${r.visitors}`).join(", "),
    columns: rows.map((r, i) => {
      const height = minLength((r.visitors / (max || 1)) * plot, 2);
      return {
        label: r.label,
        n: formatInt(r.visitors),
        x: Math.round(i * colWidth + 6),
        width: Math.round(colWidth - 12),
        mid: Math.round(i * colWidth + colWidth / 2),
        y: 24 + plot - height,
        height,
        textY: 24 + plot - height - 6
      };
    })
  };
}

export function bars(rows, key, label) {
  const max = Math.max(0, ...rows.map((r) => r[key]));
  return rows.map((r) => ({ name: r[label], n: formatInt(r[key]), width: minLength(pct(r[key], max), 0.5) }));
}

// ─── Over time ───────────────────────────────────────────────────────────────

/** A week is in progress if it starts within 7 days of the data time. */
export function isPartialWeek(weekOf, generatedAt) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(generatedAt));
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${weekOf}T00:00:00Z`)) / 86400000;
  return age < 7;
}

/** A tidy round number at or above `value`: 40 stays 40, 43 becomes 45. */
export function niceCeil(value) {
  if (value <= 10) return 10;
  const step = 10 ** (Math.floor(Math.log10(value)) - 1) * 5;
  return Math.ceil(value / step) * step;
}

const SECTION_KINDS = ["music", "orchestra", "comedy", "theatre", "opera", "other"];

export function weekly(s) {
  const weeks = s.weekly.weeks;
  const totals = weeks.map((w) => w.views.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const colStep = 720 / weeks.length;
  const plot = 190;
  const partial = weeks.map((w) => isPartialWeek(w.weekOf, s.generatedAt));
  const partialWeek = weeks.find((_, i) => partial[i]);

  const columns = weeks.map((w, i) => {
    const height = minLength((totals[i] / max) * plot, 1);
    return {
      x: Math.round((i * colStep + 1.5) * 10) / 10,
      width: Math.round((colStep - 3) * 10) / 10,
      mid: Math.round((i * colStep + colStep / 2) * 10) / 10,
      y: Math.round((22 + plot - height) * 10) / 10,
      height: Math.round(height * 10) / 10,
      total: totals[i] >= 40 || partial[i] ? formatInt(totals[i]) : "",
      tick: i % 4 === 0 ? dayMonth(w.weekOf) : "",
      partial: partial[i]
    };
  });

  const peak = Math.max(0, ...weeks.flatMap((w) => w.views));
  const scale = niceCeil(peak);
  const months = [weeks[0], weeks[Math.floor((weeks.length - 1) / 2)], weeks.at(-1)]
    .map((w) => new Date(`${w.weekOf}T00:00:00Z`).toLocaleString("en-NZ", { month: "short", timeZone: "UTC" }));

  const panels = s.weekly.sections.map((name, si) => {
    const values = weeks.map((w) => w.views[si]);
    return {
      name,
      kind: SECTION_KINDS[si],
      total: formatInt(values.reduce((a, b) => a + b, 0)),
      label: `${name} views per week, peak ${Math.max(0, ...values)}`,
      bars: values.map((v, i) => {
        const height = Math.round(pct(Math.min(v, scale), scale) * 10) / 10;
        return { x: i, height, y: Math.round((100 - height) * 10) / 10, partial: partial[i] && v > 0, hidden: partial[i] && v === 0 };
      })
    };
  });

  return {
    columns,
    label: `Weekly page views, ${weeks.length} weeks from ${dayMonth(weeks[0].weekOf)}, peak ${formatInt(Math.max(...totals))}`,
    partialWeek: partialWeek ? dayMonth(partialWeek.weekOf) : "",
    scale: formatInt(scale),
    weekCount: weeks.length,
    months,
    panels
  };
}

const HOUR_LABELS = { 0: "midnight", 3: "3am", 6: "6am", 9: "9am", 12: "noon", 15: "3pm", 18: "6pm", 21: "9pm" };

export function heatmap(s) {
  const views = s.heatmap.views;
  const max = Math.max(1, ...views.flat());
  const dayTotals = views.map((row) => row.reduce((a, b) => a + b, 0));
  const maxDay = Math.max(1, ...dayTotals);
  return {
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, label: HOUR_LABELS[h] ?? "" })),
    days: s.heatmap.days.map((day, d) => ({
      day,
      total: formatInt(dayTotals[d]),
      width: pct(dayTotals[d], maxDay),
      cells: views[d].map((v, h) => ({
        v,
        opacity: v === 0 ? 0 : Math.round((0.12 + 0.88 * Math.sqrt(v / max)) * 100) / 100,
        label: `${day} ${String(h).padStart(2, "0")}:00, ${plural(v, "view")}`
      }))
    }))
  };
}

// ─── What's read ─────────────────────────────────────────────────────────────

const TITLE_LENGTH = 32;

/*
  The slope chart. Left: all-time rank; right: last-90-days rank; a line
  joins a post's two ranks. Rising is any improvement, falling is two or
  more places down, anything else is steady. A post only on the right is
  "new" and gets a short dashed stub. Null when there is no data to rank.
*/
export function slope(allTime, recent) {
  if (!allTime?.length || !recent?.length) return null;
  const y = (rank) => 60 + rank * 40;
  const allRank = new Map(allTime.map((p, i) => [p.title, i]));
  const recentRank = new Map(recent.map((p, i) => [p.title, i]));
  const movement = (title) => {
    const before = allRank.get(title);
    const now = recentRank.get(title);
    if (before === undefined || now === undefined) return "steady";
    if (now < before) return "rising";
    if (now - before >= 2) return "falling";
    return "steady";
  };

  return {
    height: 60 + Math.max(allTime.length, recent.length) * 40,
    left: allTime.map((p, i) => ({ title: truncate(p.title, TITLE_LENGTH), views: formatInt(p.views), y: y(i) + 5, move: movement(p.title) })),
    right: recent.map((p, i) => ({
      title: truncate(p.title, TITLE_LENGTH),
      views: formatInt(p.views),
      y: y(i) + 5,
      move: movement(p.title),
      isNew: !allRank.has(p.title)
    })),
    lines: recent.map((p, i) => (allRank.has(p.title)
      ? { x1: 320, y1: y(allRank.get(p.title)), x2: 460, y2: y(i), move: movement(p.title), stub: false }
      : { x1: 410, y1: y(i), x2: 460, y2: y(i), move: "steady", stub: true }))
  };
}

export function reading(s) {
  return {
    withoutGigs: slope(s.posts.allTime, s.posts.recent90),
    withGigs: slope(s.posts.allTimeWithGigs, s.posts.recent90WithGigs)
  };
}

export function landing(s) {
  const max = Math.max(1, ...s.landing.map((p) => p.sessions));
  return s.landing.map((p) => {
    const width = minLength(pct(p.sessions, max), 1);
    const single = Math.round((p.singlePage / (p.sessions || 1)) * width * 10) / 10;
    return {
      name: p.page,
      sessions: formatInt(p.sessions),
      singleWidth: single,
      moreX: single,
      moreWidth: Math.round((width - single) * 10) / 10,
      left: `${Math.round((p.singlePage / (p.sessions || 1)) * 100)}%`,
      label: `${p.page}: ${plural(p.sessions, "session")}, ${formatInt(p.singlePage)} single-page`
    };
  });
}

export function exits(s) {
  return bars(s.exits, "sessions", "page").map((row, i) => ({ ...row, top: i === 0 }));
}

export function transitions(s) {
  const { sections, counts } = s.transitions;
  const max = Math.max(1, ...counts.flat());
  return {
    sections,
    rows: counts.map((row, i) => ({
      from: sections[i],
      cells: row.map((n, j) => {
        const opacity = n === 0 ? 0 : Math.round((0.12 + 0.88 * (n / max)) * 100) / 100;
        return {
          n: formatInt(n),
          opacity,
          onAccent: opacity > 0.55,
          same: i === j,
          label: `${sections[i]} to ${sections[j]}: ${plural(n, "move")}`
        };
      })
    }))
  };
}

// ─── Arrivals and small signals ──────────────────────────────────────────────

const REFERRER_KINDS = { "Direct": "noise", "Internal": "noise-faint", "Search": "real-mid", "Shared links": "real", "Other": "real-low" };

export function referrers(s) {
  const rows = s.referrers;
  const total = rows.reduce((a, r) => a + r.visitors, 0);
  const direct = rows.find((r) => r.group === "Direct")?.visitors ?? 0;
  const segments = stack(rows.map((r) => r.visitors), 0.4, 0.6);
  return {
    directShare: `${Math.round(pct(direct, total))}%`,
    label: "Visitors by source: " + rows.map((r) => `${r.visitors} ${r.group.toLowerCase()}`).join(", "),
    rows: rows.map((r, i) => ({ ...segments[i], group: r.group, detail: r.detail, n: formatInt(r.visitors), kind: REFERRER_KINDS[r.group] }))
  };
}

const RETURN_KINDS = { "1 day": "once", "2 days": "real-low", "3–4 days": "real-mid", "5+ days": "real" };

export function returns(s) {
  const rows = s.returns;
  const once = rows.find((r) => r.label === "1 day")?.visitors ?? 0;
  const total = rows.reduce((a, r) => a + r.visitors, 0);
  const fivePlus = rows.find((r) => r.label === "5+ days")?.visitors ?? 0;
  return {
    cameBack: formatInt(total - once),
    fivePlus: formatInt(fivePlus),
    label: `${formatInt(total)} visitors: ` + rows.map((r) => `${r.visitors} on ${r.label}`).join(", "),
    legend: rows.map((r) => ({ label: r.label, n: formatInt(r.visitors), kind: RETURN_KINDS[r.label] })),
    field: dotGrid([...rows].reverse().flatMap((r) => repeat(RETURN_KINDS[r.label], r.visitors)), 32, 14, 10)
  };
}

export function signals(s) {
  const t = s.totals;
  return {
    outbound: {
      total: formatInt(t.outboundClicks),
      rows: s.outbound.map((o) => ({ name: o.destination, n: o.clicks, units: repeat(1, o.clicks) }))
    },
    notFound: { total: formatInt(t.notFoundHits), rows: s.notFound.map((r) => ({ path: r.path, n: formatInt(r.hits) })) },
    theme: {
      total: formatInt(t.themeToggles),
      toggles: repeat(1, t.themeToggles),
      people: repeat(1, t.themeTogglePeople),
      summary: `${people(t.themeTogglePeople)}, average ${formatInt(t.themeTogglePeople ? Math.round(t.themeToggles / t.themeTogglePeople) : 0)} toggles each`,
      countries: (t.themeCountries ?? []).join(", "),
      label: `${plural(t.themeToggles, "toggle")} by ${people(t.themeTogglePeople)}`
    }
  };
}

// ─── Everything ──────────────────────────────────────────────────────────────

/** The whole page's view model, from one snapshot. */
export function siteStatsView(s) {
  return {
    header: header(s),
    real: real(s),
    tiles: tiles(s),
    compare: compare(s),
    depth: depth(s),
    countries: mirror(s.countries),
    cities: cities(s),
    devices: mirror(s.devices),
    widths: widths(s),
    languages: bars(s.languages, "visitors", "name"),
    weekly: weekly(s),
    heatmap: heatmap(s),
    reading: reading(s),
    landing: landing(s),
    exits: exits(s),
    transitions: transitions(s),
    referrers: referrers(s),
    returns: returns(s),
    signals: signals(s)
  };
}
