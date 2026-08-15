/*
  Rebuilds the Gig Tracker page from content/GigTracker/gig-history.html and
  gig-history.css on every build, so whatever those two files currently say is
  what the site publishes. They are written by a separate agent and are not
  edited here — see content/GigTracker/README.md for the contract they follow.

  All the logic lives in lib/embed-app.mjs; this file is the site-specific
  half: which controls to drop, and what the app's palette means in terms of
  the site's own theme tokens.
*/
import fs from "node:fs";
import path from "node:path";

import { buildAppEmbed } from "../../lib/embed-app.mjs";

const APP_DIR = path.join(import.meta.dirname, "..", "GigTracker");
const SCOPE = ".gig-tracker";

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
  "--row-hover": "var(--color-hairline)"
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

export default function () {
  const embed = buildAppEmbed({
    html: fs.readFileSync(path.join(APP_DIR, "gig-history.html"), "utf8"),
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
