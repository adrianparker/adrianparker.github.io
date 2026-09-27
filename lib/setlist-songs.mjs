/*
  Parses content/GigTracker/setlist-songs.md — one song per row, sourced from
  the setlist.fm setlists referenced by gig-history.md's `Setlist.fm ID`
  column (see that file's own header comment, and content/GigTracker/README.md)
  — and turns it, together with the currently visible gig rows for a single
  performer, into the "Songs heard live" statistics card's data.
*/
import { parseSetlistIds } from "./setlist-ids.mjs";

const HEADER_PREFIX = "| Setlist.fm ID |";
// A song title can itself contain a literal "|" (escaped as "\|" in the
// file, the same convention lib/setlist-ids.mjs uses for a literal comma in
// a performer name), so cells are split on an unescaped pipe only, then
// unescaped back to a plain "|".
const UNESCAPED_PIPE = /(?<!\\)\|/;

function isHeaderRow(line) {
  return line.startsWith(HEADER_PREFIX);
}

function isSeparatorRow(line) {
  return line.startsWith("|---");
}

function splitRow(line) {
  return line.split(UNESCAPED_PIPE).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

/**
 * Extracts one row per song from the markdown table: { id, performer, date,
 * song }. Lines before the header, the header and separator rows, and
 * anything after the table are ignored, mirroring parseGigHistory in
 * lib/gig-history.mjs. A row whose Song cell is blank — an id that was
 * looked up and returned zero songs, kept so a refresh knows not to
 * re-fetch it — carries nothing to count and is skipped.
 */
export function parseSetlistSongs(markdown) {
  const lines = markdown.split("\n").map((line) => line.trim());
  const headerIndex = lines.findIndex(isHeaderRow);
  if (headerIndex === -1) return [];

  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (isSeparatorRow(line)) continue;
    if (!line.startsWith("|")) break;

    const [, id, performer, date, song] = splitRow(line);
    if (song) rows.push({ id, performer, date, song });
  }
  return rows;
}

/**
 * Given the gig rows currently visible for a single performer and the rows
 * parsed by parseSetlistSongs, returns [{ song, count }] — how many of those
 * gigs' setlists included each song — sorted by count descending, then by
 * title ascending (case-insensitive) for ties.
 *
 * A gig's Setlist.fm ID column can hold one id per performer on the bill, so
 * only the id belonging to `performer` on each row counts towards its songs
 * (parseSetlistIds is the same parser gig-history.html's own splitSetlistIds
 * mirrors for the chip itself).
 */
export function songsHeardLive(performer, gigRows, setlistSongs) {
  const ids = new Set();
  gigRows.forEach((gig) => {
    const entry = parseSetlistIds(gig.setlistfmId).get(performer);
    if (entry) ids.add(entry.id);
  });

  const counts = new Map();
  setlistSongs.forEach((row) => {
    if (!ids.has(row.id)) return;
    counts.set(row.song, (counts.get(row.song) || 0) + 1);
  });

  return Array.from(counts, ([song, count]) => ({ song, count }))
    .sort((a, b) => b.count - a.count || a.song.toLowerCase().localeCompare(b.song.toLowerCase()));
}
