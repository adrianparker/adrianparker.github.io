/*
  Artist and venue hub pages (#256): every act or venue with two or more
  gig reviews gets a page listing those reviews and its Gig History rows.

  Gigs are Eleventy collection items, or anything shaped like one:
  `{ url, date, data }`. Nothing here touches Eleventy itself, so it is all
  unit tested with plain objects.
*/

/** How many reviews an act or venue needs before it earns a hub page. */
export const HUB_MIN_REVIEWS = 2;

const UNESCAPED_COMMA = /(?<!\\),/;

/**
 * Splits a comma-separated list of names, honouring the "\," escape used
 * for a literal comma in a name (the same convention as gig-history.md and
 * the `setlistfm` front matter). Accepts a string or an array of strings.
 */
export function splitNames(value) {
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .filter((part) => typeof part === "string")
    .flatMap((part) => part.split(UNESCAPED_COMMA))
    .map((name) => name.trim().replace(/\\,/g, ","))
    .filter(Boolean);
}

/** A URL slug: lower case, "&" as "and", anything else non-alphanumeric as "-". */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const key = (name) => name.toLowerCase();

/** Every act on a gig review: the headliner and the support, split. */
export function performersOf(data) {
  return splitNames([data.headlineArtist, ...(data.supportArtists ?? [])]);
}

/**
 * The hub pages for one kind ("performer" or "venue"): every act or venue
 * with at least HUB_MIN_REVIEWS reviews, each with its reviews (oldest
 * first) and its Gig History rows (newest first). An act is matched in a
 * Gig History row's Show or Association column; a venue by its Venue
 * column. Names match case-insensitively; a hub takes the spelling of its
 * first review.
 */
export function buildHubs(gigs, historyRows, kind) {
  const namesOf = (entry) => (kind === "performer" ? performersOf(entry.data) : splitNames(entry.data.venue));
  const rowNames = (row) => (kind === "performer" ? splitNames([row.performer, row.association]) : splitNames(row.venue));

  const hubs = new Map();
  for (const gig of [...gigs].sort((a, b) => a.date - b.date)) {
    for (const name of new Set(namesOf(gig))) {
      const hub = hubs.get(key(name)) ?? { name, slug: slugify(name), kind, reviews: [], rows: [] };
      hub.reviews.push(gig);
      hubs.set(key(name), hub);
    }
  }

  const eligible = [...hubs.values()].filter((hub) => hub.reviews.length >= HUB_MIN_REVIEWS);
  for (const hub of eligible) {
    hub.rows = historyRows
      .filter((row) => rowNames(row).some((name) => key(name) === key(hub.name)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  return eligible.sort((a, b) => a.name.localeCompare(b.name));
}

/** The hub for a name, or undefined when it has none. */
export function hubFor(hubs, name) {
  return name ? hubs.find((hub) => key(hub.name) === key(name)) : undefined;
}
