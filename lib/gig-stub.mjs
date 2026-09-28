/*
  Builds a new gig review post stub from a content/GigTracker/gig-history.md
  row (as parsed by parseGigHistory in lib/gig-history.mjs), so a new gig
  post can be scaffolded with the metadata already filled in instead of
  typed by hand. See scripts/new-gig.mjs for the CLI that uses this, and
  CLAUDE.md's "Gig" section for the front matter contract this follows.

  Note that `layout` and `tags` are deliberately not part of the front
  matter this produces: content/posts/gigs/gigs.11tydata.json sets both for
  every file in the directory, and the real gig posts omit them too.
*/

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const UNESCAPED_COMMA = /(?<!\\),/;

/** Splits a `Show` (or `Association`) column value into performer names, undoing `\,` escaping. */
export function splitPerformers(str) {
  if (!str) return [];
  return str
    .split(UNESCAPED_COMMA)
    .map((entry) => entry.trim().replace(/\\,/g, ","))
    .filter(Boolean);
}

/** True if `artist` matches (case-insensitive substring) any performer in the gig's Show column. */
function matchesArtist(gig, artist) {
  const needle = artist.toLowerCase();
  return splitPerformers(gig.performer).some((name) => name.toLowerCase().includes(needle));
}

/**
 * Rows from `gigs` (parseGigHistory's output) whose Show column includes a
 * performer matching `artist`, newest first.
 */
export function findGigs(gigs, artist) {
  return gigs
    .filter((gig) => matchesArtist(gig, artist))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function formatMetadescDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * Builds the front matter object for a gig review stub from a gig-history
 * row. `summary` and `photos` are optional: `summary` falls back to the
 * row's Notes column when non-blank, else a placeholder for the author to
 * replace; `photos` is only set (as the stem) when explicitly given.
 */
export function gigFrontMatter(gig, { summary, photos } = {}) {
  const performers = splitPerformers(gig.performer);
  const [headlineArtist, ...supportArtists] = performers;
  const year = gig.date.slice(0, 4);

  const frontMatter = {
    title: `${headlineArtist} @ ${gig.venue}, ${gig.city}`,
    navtitle: `${year} ${headlineArtist}`,
    summary: summary || gig.show || "One line summary",
    metadesc: `Concert review of ${headlineArtist} at ${gig.venue}, ${gig.city}, ${formatMetadescDate(gig.date)}.`,
    date: gig.date,
    readingtime: "1 minute",
    headlineArtist,
    venue: gig.venue,
    city: gig.city,
    country: gig.country
  };

  if (supportArtists.length > 0) {
    frontMatter.supportArtists = supportArtists;
  }

  if (gig.setlistfmId) {
    frontMatter.setlistfm = gig.setlistfmId;
  }

  if (photos) {
    frontMatter.photos = photos;
  }

  // Re-insert keys in CLAUDE.md's documented order (headlineArtist first,
  // then supportArtists if present, then venue/city/country/setlistfm/photos).
  const ordered = {};
  for (const key of ["title", "navtitle", "summary", "metadesc", "date", "readingtime", "headlineArtist"]) {
    ordered[key] = frontMatter[key];
  }
  if (frontMatter.supportArtists) { ordered.supportArtists = frontMatter.supportArtists; }
  for (const key of ["venue", "city", "country"]) {
    ordered[key] = frontMatter[key];
  }
  if (frontMatter.setlistfm) { ordered.setlistfm = frontMatter.setlistfm; }
  if (frontMatter.photos) { ordered.photos = frontMatter.photos; }

  return ordered;
}

function sanitizeForStem(str) {
  return str
    .replace(/&/g, "and")
    .replace(/[^A-Za-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** `YYYYMMDD-Artist-Venue-City` file stem for a gig-history row. */
export function gigStem(gig) {
  const [headlineArtist] = splitPerformers(gig.performer);
  const datePart = gig.date.replaceAll("-", "");
  return [datePart, sanitizeForStem(headlineArtist), sanitizeForStem(gig.venue), sanitizeForStem(gig.city)].join("-");
}

function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function yamlStringArray(values) {
  return `[${values.map(yamlString).join(", ")}]`;
}

/**
 * Renders a gig stub's front matter object (from gigFrontMatter) plus a
 * placeholder body into the markdown file content, in CLAUDE.md's
 * documented key order.
 */
export function renderGigStub(frontMatter) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(frontMatter)) {
    if (key === "date") {
      lines.push(`date: ${value}`);
    } else if (Array.isArray(value)) {
      lines.push(`${key}: ${yamlStringArray(value)}`);
    } else {
      lines.push(`${key}: ${yamlString(value)}`);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("Opening paragraph — set the scene.");
  lines.push("");
  lines.push("<!-- excerpt -->");
  lines.push("");
  lines.push("Rest of the review.");
  lines.push("");

  return lines.join("\n");
}
