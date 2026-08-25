/*
  Parses content/GigTracker/Locations.md into a lookup the map view uses to
  place a gig on the map — see that file's own header for the data contract
  and content/GigTracker/README.md for how it joins to gig-history.md.
*/

const COLUMNS = ["country", "city", "venue", "location"];
const LATLNG = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;

function isHeaderRow (line) {
  return line.startsWith("| Country");
}

function isSeparatorRow (line) {
  return line.startsWith("|---");
}

function splitRow (line) {
  return line.split("|").map((cell) => cell.trim());
}

/**
 * A Location cell that is exactly "lat, lng" resolves to numeric
 * coordinates. Anything else — a street address, or blank — resolves to
 * null on both fields, since neither can be dropped onto a map without a
 * geocoding step this file deliberately has none of (see the plan for #139).
 */
function parseCoordinates (location) {
  const match = LATLNG.exec(location);
  if (!match) { return { lat: null, lng: null }; }
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

/**
 * Extracts location rows from the markdown table. Mirrors parseGigHistory's
 * tolerance for free text before the header and after the table — only
 * lines starting with "|" between the header and the end of the table count.
 */
export function parseLocations (markdown) {
  const lines = markdown.split("\n").map((line) => line.trim());
  const headerIndex = lines.findIndex(isHeaderRow);
  if (headerIndex === -1) { return []; }

  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (isSeparatorRow(line)) { continue; }
    if (!line.startsWith("|")) { break; }

    const cells = splitRow(line);
    const fields = cells.slice(1, -1);
    const [country, city, venue, location] = fields;
    rows.push({ country, city, venue, ...parseCoordinates(location) });
  }
  return rows;
}

/**
 * An exact Country/City/Venue row's coordinates, or null if there is no such
 * row or it has none (an address string, or blank). Exported separately from
 * resolveLocation so callers can tell a gig's own venue was found from it
 * having fallen back to the city — see gigTrackerApp.mjs's hasVenueLocation.
 */
export function findLocation (rows, { country, city, venue }) {
  const row = rows.find(
    (r) => r.country === country && r.city === city && r.venue === venue
  );
  if (row && row.lat !== null) {
    return { lat: row.lat, lng: row.lng };
  }
  return null;
}

/**
 * Resolves a gig's coordinates: an exact Country/City/Venue match if it has
 * numeric coordinates, else that Country/City's blank-Venue row, else null —
 * the gig has no usable location and the map view skips it.
 */
export function resolveLocation (rows, gig) {
  return findLocation(rows, gig) || findLocation(rows, { ...gig, venue: "" });
}
