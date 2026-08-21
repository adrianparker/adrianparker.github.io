/*
  Parses content/GigTracker/gig-history.md into the row data the Gig Tracker
  app needs. The file is a hand-maintained markdown table with a header row
  ("| Date | Show | ... |"), a separator row ("|---|---|..."), and one
  data row per gig — see content/GigTracker/README.md for the exact contract.
*/

const COLUMNS = ["date", "performer", "category", "city", "country", "venue", "show", "association", "setlistfmId"];

function isSeparatorRow (line) {
  return line.startsWith("|---");
}

function isHeaderRow (line) {
  return line.startsWith("| Date");
}

function parseRow (line) {
  const cells = line.split("|").map((cell) => cell.trim());

  // A well-formed "| a | b | ... |" line splits into one empty string
  // before the first "|" and one after the last, plus a cell per column.
  if (cells.length !== COLUMNS.length + 2) { return null; }

  const fields = cells.slice(1, -1);
  return Object.fromEntries(COLUMNS.map((name, i) => [name, fields[i]]));
}

/**
 * Extracts gig rows from the markdown table. Lines before the header, the
 * header and separator rows themselves, and anything after the table (a
 * trailing blank line, notes, EOF) are ignored. A data row with the wrong
 * number of columns is skipped rather than thrown on, since the file is
 * hand-edited.
 */
export function parseGigHistory (markdown) {
  const lines = markdown.split("\n").map((line) => line.trim());
  const headerIndex = lines.findIndex(isHeaderRow);
  if (headerIndex === -1) { return []; }

  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (isSeparatorRow(line)) { continue; }
    if (!line.startsWith("|")) { break; }

    const row = parseRow(line);
    if (row) { rows.push(row); }
  }
  return rows;
}
