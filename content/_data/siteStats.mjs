/*
  The data behind /Site-Stats/. Where it comes from, in order:

  1. SITE_STATS_FIXTURE=1: the frozen test fixture, so smoke, theme and
     visual tests never drift with live data.
  2. POSTHOG_PERSONAL_API_KEY set: live from PostHog, cached in .cache/ for an
     hour so `npm run serve` reloads don't re-query. A failed fetch fails the
     build: a page claiming fresh data must not quietly show old data.
  3. Otherwise (forks, CI on PRs, a clone with no .env): the committed
     snapshot in content/SiteStats/snapshot.json, refreshed by
     `npm run stats:snapshot`.

  The queries and all the shaping live in lib/site-stats-fetch.mjs; this file
  is the I/O half: the HTTP call, the cache, and the site's own page list.
*/
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { fetchSnapshot } from "../../lib/site-stats-fetch.mjs";

const ROOT = path.join(import.meta.dirname, "..", "..");
const CONTENT = path.join(ROOT, "content");
const CACHE_FILE = path.join(ROOT, ".cache", "site-stats.json");
const CACHE_MS = 60 * 60 * 1000;

export const SNAPSHOT_FILE = path.join(CONTENT, "SiteStats", "snapshot.json");
const FIXTURE_FILE = path.join(ROOT, "tests", "fixtures", "site-stats-sample.json");

// PostHog EU cloud, project "AdrianParker.com".
const QUERY_URL = "https://eu.posthog.com/api/projects/2097/query/";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/*
  Every page the stats can name, so a path is shown as its title and sorted
  into the right section without a hand-kept list.
*/
function sitePages() {
  const fromDir = (dir, urlPrefix, kind) => fs.readdirSync(path.join(CONTENT, dir))
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const { title, redirectTo } = matter.read(path.join(CONTENT, dir, file)).data;
      return { path: `${urlPrefix}${path.basename(file, ".md")}/`, title, kind, redirectTo };
    });

  const apps = fs.readdirSync(CONTENT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(CONTENT, entry.name, "index.njk")))
    .map((entry) => ({ dir: entry.name, data: matter.read(path.join(CONTENT, entry.name, "index.njk")).data }))
    .filter(({ data }) => (data.tags ?? []).includes("app"))
    .map(({ dir, data }) => ({
      path: data.permalink ? data.permalink.replace(/index\.html$/, "") : `/${dir}/`,
      title: data.title,
      kind: "app"
    }));

  return [
    { path: "/", title: "Home", kind: "home" },
    { path: "/posts/", title: "Posts index", kind: "index" },
    { path: "/gigs/", title: "Gigs index", kind: "index" },
    { path: "/apps/", title: "Apps index", kind: "index" },
    ...fromDir("posts", "/posts/", "post"),
    ...fromDir(path.join("posts", "gigs"), "/posts/gigs/", "gig"),
    ...apps
  ];
}

async function runHogQL(sql) {
  const response = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query: sql } })
  });
  if (!response.ok) {
    throw new Error(`[site-stats] PostHog query failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()).results;
}

/** Fetches a fresh snapshot from PostHog. Also used by `npm run stats:snapshot`. */
export function liveSnapshot() {
  return fetchSnapshot({ run: runHogQL, now: new Date(), pages: sitePages() });
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
