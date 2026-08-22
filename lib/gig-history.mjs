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

function splitRow (line) {
  return line.split("|").map((cell) => cell.trim());
}

/**
 * Extracts gig rows from the markdown table. Lines before the header, the
 * header and separator rows themselves, and anything after the table (a
 * trailing blank line, notes, EOF) are ignored. A data row whose column
 * count doesn't match the header's throws rather than being silently
 * skipped — a hand-edited row with too few or too many columns should fail
 * the build instead of quietly vanishing from the site.
 */
export function parseGigHistory (markdown) {
  const lines = markdown.split("\n").map((line) => line.trim());
  const headerIndex = lines.findIndex(isHeaderRow);
  if (headerIndex === -1) { return []; }

  // A well-formed "| a | b | ... |" line splits into one empty string
  // before the first "|" and one after the last, plus a cell per column.
  const expectedCells = splitRow(lines[headerIndex]).length;

  const rows = [];
  for (const [offset, line] of lines.slice(headerIndex + 1).entries()) {
    if (isSeparatorRow(line)) { continue; }
    if (!line.startsWith("|")) { break; }

    const cells = splitRow(line);
    if (cells.length !== expectedCells) {
      const lineNumber = headerIndex + offset + 2;
      throw new Error(
        `gig-history.md line ${lineNumber} has ${cells.length - 2} column(s), ` +
        `expected ${expectedCells - 2} to match the header row: ${line}`
      );
    }

    const fields = cells.slice(1, -1);
    rows.push(Object.fromEntries(COLUMNS.map((name, i) => [name, fields[i]])));
  }
  return rows;
}
