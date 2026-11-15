/*
  IndexNow (#250): tells Bing, Yandex, Seznam and friends which pages changed
  on a deploy, instead of waiting for them to recrawl.

  "Changed" is decided by comparing each page in the freshly built sitemap
  with the copy currently live on the site, before the deploy replaces it.
  GitHub Pages serves exactly the bytes it was given, so an unchanged page is
  byte-identical, and a page that 404s live is new. A template change that
  touches every page (the sidebar's newest posts, say) submits every page,
  which is what should happen.

  Everything here is pure or takes its I/O as arguments, so it is unit
  tested; scripts/indexnow.mjs wires in the real filesystem and fetch.
*/

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** The <loc> URLs in a sitemap.xml document, in order. */
export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/**
 * The path, relative to the build directory, of the file a sitemap URL is
 * served from: "/" and "/posts/" are directory index pages.
 */
export function builtFilePath(url, siteUrl) {
  if (!url.startsWith(siteUrl)) {
    throw new Error(`${url} is not on ${siteUrl}`);
  }
  const pathname = url.slice(siteUrl.length) || "/";
  return pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
}

/**
 * The URLs whose built copy differs from the live one.
 *
 * `readBuilt(url)` returns the built file's contents. `fetchLive(url)`
 * returns the live body, `null` for a 404 (a new page), or throws on any
 * other failure — a URL that cannot be checked is left out rather than
 * guessed at, so a flaky fetch never floods the submission.
 */
export async function findChangedUrls(urls, { readBuilt, fetchLive }) {
  const changed = [];
  for (const url of urls) {
    let live;
    try {
      live = await fetchLive(url);
    } catch {
      continue;
    }
    if (live === null || live !== readBuilt(url)) changed.push(url);
  }
  return changed;
}

/** The JSON body IndexNow expects, or null when there is nothing to send. */
export function buildPayload({ siteUrl, key, urls }) {
  if (urls.length === 0) return null;
  return {
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList: urls
  };
}
