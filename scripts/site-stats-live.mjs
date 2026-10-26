/*
  The I/O half of fetching Site Stats from PostHog: the HTTP call and the
  site's own page list. Used by content/_data/siteStats.mjs during a build
  and by `npm run stats:snapshot`. The queries and all the shaping live in
  lib/site-stats-fetch.mjs, which is unit-tested; this file is not.

  Kept out of the data file because Eleventy hands a data file's named
  exports to templates in place of its default export.
*/
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { fetchSnapshot } from "../lib/site-stats-fetch.mjs";

const CONTENT = path.join(import.meta.dirname, "..", "content");

export const SNAPSHOT_FILE = path.join(CONTENT, "SiteStats", "snapshot.json");

// PostHog EU cloud, project "AdrianParker.com".
const QUERY_URL = "https://eu.posthog.com/api/projects/2097/query/";

/*
  Every page the stats can name, so a path is shown as its title and sorted
  into the right section without a hand-kept list. A redirect stub (a
  renamed gig) carries redirectTo, so its old URL counts towards the new one.
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

/** Fetches a fresh snapshot from PostHog. Needs POSTHOG_PERSONAL_API_KEY. */
export function liveSnapshot() {
  return fetchSnapshot({ run: runHogQL, now: new Date(), pages: sitePages() });
}
