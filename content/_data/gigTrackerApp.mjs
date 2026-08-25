/*
  Rebuilds the Gig Tracker page from content/GigTracker/gig-history.html and
  gig-history.css on every build, so whatever those two files currently say is
  what the site publishes. They are written by a separate agent and are not
  edited here — see content/GigTracker/README.md for the contract they follow.

  The gig data itself is not read from the HTML's own `let GIGS = [...]` line
  — that line is replaced below with data parsed fresh from
  content/GigTracker/gig-history.md on every build, so updating that one
  markdown file and rebuilding is enough to publish new gigs, with no need to
  regenerate or hand-copy the HTML/CSS shell.

  All the logic lives in lib/embed-app.mjs; this file is the site-specific
  half: which controls to drop, and what the app's palette means in terms of
  the site's own theme tokens.
*/
import fs from "node:fs";
import path from "node:path";

import { buildAppEmbed } from "../../lib/embed-app.mjs";
import { parseGigHistory } from "../../lib/gig-history.mjs";
import { parseLocations, resolveLocation } from "../../lib/locations.mjs";

const APP_DIR = path.join(import.meta.dirname, "..", "GigTracker");
const SCOPE = ".gig-tracker";
const GIGS_ASSIGNMENT = /let GIGS = \[.*\];/;

/*
  The reload controls re-read gig-history.md off disk, which is how the app
  refreshes itself when opened straight from a folder. On the site the data is
  already baked into the page by this build, the markdown is not published,
  and a failed fetch drops the visitor into a file picker — so the controls
  are moved into a hidden container rather than shown.
*/
const QUARANTINED_CONTROLS = ["reload", "file-input", "reload-status"];

/*
  The app's own custom properties, restated in terms of the site's tokens.
  Those tokens are already declared twice in static/index.css — a dark value,
  then a light-dark() override — so mapping onto them is what makes the app
  follow the theme toggle without it knowing anything about themes.
*/
const PALETTE = {
  "--bg": "var(--color-bg-bottom)",
  "--panel": "var(--color-bg-top)",
  "--border": "var(--color-rule)",
  "--text": "var(--color-text)",
  "--muted": "var(--color-muted)",
  "--accent": "var(--color-accent)",
  /*
    Rows sit on --panel, so the stripe and the hover both have to read as a
    shift away from it. --color-bg-bottom is the site's other surface colour
    and is a near neighbour in both themes, which keeps the stripe quiet;
    --color-hairline is a translucent accent tint, stronger in light than in
    dark, so it goes on hover where being noticeable is the point.
  */
  "--row-alt": "var(--color-bg-bottom)",
  "--row-hover": "var(--color-hairline)",
  /*
    Category colours for the Statistics chart, mapped onto their own site
    tokens (added to static/index.css alongside the tokens above) rather than
    reusing an existing one, so each category keeps a distinct, consistent
    colour (blue = Music, yellow = Theatre, ...) in both themes.
  */
  "--cat-music": "var(--color-cat-music)",
  "--cat-theatre": "var(--color-cat-theatre)",
  "--cat-comedy": "var(--color-cat-comedy)",
  "--cat-opera": "var(--color-cat-opera)",
  "--cat-orchestra": "var(--color-cat-orchestra)",
  "--cat-other": "var(--color-cat-other)"
};

/*
  Colours the app wrote as literals instead of going through its palette.
  Anything not listed here still renders, it just will not follow the theme —
  buildAppEmbed reports those so they can be fixed at the source.
*/
const LITERAL_COLOURS = {
  "#1c2029": "var(--color-bg-bottom)",
  "#2a2e38": "var(--color-rule)"
};

/**
 * Attaches lat/lng to each gig, resolved against Locations.md (see
 * lib/locations.mjs). A Country/City/Venue combination with no usable
 * coordinates — the map view's fallback chain has nowhere left to go — is
 * warned about once rather than failing the build, since a gap here means
 * Locations.md is stale, not that the gig data is wrong.
 */
function withCoordinates (gigs, locations) {
  const warned = new Set();
  return gigs.map((gig) => {
    const resolved = resolveLocation(locations, gig);
    if (!resolved) {
      const key = `${gig.country} / ${gig.city} / ${gig.venue}`;
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[gig-tracker] no map location resolved for ${key} — add a row to Locations.md`);
      }
      return gig;
    }
    return { ...gig, ...resolved };
  });
}

export default function () {
  const locations = parseLocations(fs.readFileSync(path.join(APP_DIR, "Locations.md"), "utf8"));
  const gigs = withCoordinates(
    parseGigHistory(fs.readFileSync(path.join(APP_DIR, "gig-history.md"), "utf8")),
    locations
  );
  const html = fs.readFileSync(path.join(APP_DIR, "gig-history.html"), "utf8")
    .replace(GIGS_ASSIGNMENT, `let GIGS = ${JSON.stringify(gigs)};`);

  const embed = buildAppEmbed({
    html,
    css: fs.readFileSync(path.join(APP_DIR, "gig-history.css"), "utf8"),
    scope: SCOPE,
    quarantineIds: QUARANTINED_CONTROLS,
    palette: PALETTE,
    colourMap: LITERAL_COLOURS
  });

  if (embed.rawColours.length > 0) {
    console.warn(
      `[gig-tracker] ${embed.rawColours.length} literal colour(s) in gig-history.css ` +
      `will not follow the light/dark theme: ${embed.rawColours.join(", ")}`
    );
  }

  return embed;
}
