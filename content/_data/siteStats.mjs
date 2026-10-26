/*
  The data behind /Site-Stats/. Where it comes from, in order:

  1. SITE_STATS_FIXTURE=1: the frozen test fixture, so theme and visual
     tests never drift with live data.
  2. POSTHOG_PERSONAL_API_KEY set: live from PostHog, cached in .cache/ for an
     hour so `npm run serve` reloads don't re-query. A failed fetch fails the
     build: a page claiming fresh data must not quietly show old data.
  3. Otherwise (forks, CI on PRs, a clone with no .env): the committed
     snapshot in content/SiteStats/snapshot.json, refreshed by
     `npm run stats:snapshot`.

  The fetching itself is scripts/site-stats-live.mjs. Only a default export
  here: Eleventy would hand any named export to templates instead.
*/
import fs from "node:fs";
import path from "node:path";

import { liveSnapshot, SNAPSHOT_FILE } from "../../scripts/site-stats-live.mjs";

const ROOT = path.join(import.meta.dirname, "..", "..");
const CACHE_FILE = path.join(ROOT, ".cache", "site-stats.json");
const CACHE_MS = 60 * 60 * 1000;
const FIXTURE_FILE = path.join(ROOT, "tests", "fixtures", "site-stats-sample.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export default async function () {
  if (process.env.SITE_STATS_FIXTURE) {
    return readJson(FIXTURE_FILE);
  }

  if (!process.env.POSTHOG_PERSONAL_API_KEY) {
    const snapshot = readJson(SNAPSHOT_FILE);
    console.log(`[site-stats] No PostHog key, using the committed snapshot from ${snapshot.generatedAt}`);
    return snapshot;
  }

  if (fs.existsSync(CACHE_FILE) && Date.now() - fs.statSync(CACHE_FILE).mtimeMs < CACHE_MS) {
    console.log("[site-stats] Using PostHog data cached within the last hour");
    return readJson(CACHE_FILE);
  }

  console.log("[site-stats] Fetching from PostHog");
  const snapshot = await liveSnapshot();
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}
