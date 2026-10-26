/*
  Rewrites content/SiteStats/snapshot.json from live PostHog data. That file
  is what the site builds from when no PostHog key is available, so commit it
  after running this. Needs POSTHOG_PERSONAL_API_KEY, normally from .env.
*/
import fs from "node:fs";

import { liveSnapshot, SNAPSHOT_FILE } from "./site-stats-live.mjs";

if (!process.env.POSTHOG_PERSONAL_API_KEY) {
  console.error("POSTHOG_PERSONAL_API_KEY is not set. Put it in .env, see README → Site Stats.");
  process.exit(1);
}

const snapshot = await liveSnapshot();
fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${SNAPSHOT_FILE} (data as of ${snapshot.generatedAt})`);
