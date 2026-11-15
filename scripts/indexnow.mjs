/*
  Prints the IndexNow payload for this deploy as one line of JSON, or nothing
  when no page changed (#250). Run by the deploy workflow after `npm run
  build` and BEFORE the deploy, because it compares _site/ with what is still
  live; the workflow sends the payload once the deploy has finished. See
  lib/indexnow.mjs.
*/
import fs from "node:fs";
import path from "node:path";

import { parseSitemap, builtFilePath, findChangedUrls, buildPayload } from "../lib/indexnow.mjs";

const SITE_DIR = "_site";
const site = JSON.parse(fs.readFileSync("content/_data/site.json", "utf8"));

const urls = parseSitemap(fs.readFileSync(path.join(SITE_DIR, "sitemap.xml"), "utf8"));
const readBuilt = (url) => fs.readFileSync(path.join(SITE_DIR, builtFilePath(url, site.url)), "utf8");
const fetchLive = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
};

const changed = await findChangedUrls(urls, { readBuilt, fetchLive });
const payload = buildPayload({ siteUrl: site.url, key: site.indexNowKey, urls: changed });
console.error(`IndexNow: ${changed.length} of ${urls.length} pages changed`);
if (payload) console.log(JSON.stringify(payload));
