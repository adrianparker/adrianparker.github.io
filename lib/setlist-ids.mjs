/*
  Parses the `setlistfm` front-matter field on a gig review post into a Map
  of performer name -> { id, empty }.

  The format is exactly the `Setlist.fm ID` column's, documented in
  content/GigTracker/README.md: one "Performer Name:id" entry per performer
  who has a setlist for the show, comma-separated, with a literal comma in a
  name escaped as "\," and an optional trailing ":empty" suffix meaning the
  setlist.fm page exists but has no songs listed yet (the id is kept so the
  chip starts working the moment songs are added, but the chip itself should
  be suppressed for it).

  This mirrors splitSetlistIds (and the splitPerformers it builds on) in
  content/GigTracker/gig-history.html exactly, so a gig review post and its
  GigTracker row present a setlist the same way.
*/

const UNESCAPED_COMMA = /(?<!\\),/;
const EMPTY_SUFFIX = ":empty";

function splitEntries(str) {
  if (!str) return [];
  return str
    .split(UNESCAPED_COMMA)
    .map((entry) => entry.trim().replace(/\\,/g, ","))
    .filter(Boolean);
}

/**
 * Parses a `setlistfm` front-matter string into a Map of performer name to
 * `{ id, empty }`. Returns an empty Map for a blank/missing value.
 */
export function parseSetlistIds(str) {
  const ids = new Map();

  for (const entry of splitEntries(str)) {
    const sep = entry.indexOf(":");
    if (sep === -1) continue;

    const name = entry.slice(0, sep).trim();
    let id = entry.slice(sep + 1).trim();
    let empty = false;
    if (id.endsWith(EMPTY_SUFFIX)) {
      empty = true;
      id = id.slice(0, -EMPTY_SUFFIX.length).trim();
    }

    if (name && id) ids.set(name, { id, empty });
  }

  return ids;
}

/**
 * True if any of the given performer names has a setlist id in `ids` whose
 * chip isn't suppressed by `:empty`. Used to decide whether a gig post needs
 * the setlist modal markup and its behaviour script at all.
 */
export function anyVisibleChip(ids, names) {
  return names.some((name) => {
    const entry = ids.get(name);
    return Boolean(entry) && !entry.empty;
  });
}
