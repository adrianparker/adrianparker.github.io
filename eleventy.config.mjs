import { existsSync, readFileSync } from "node:fs";

import pluginRss from "@11ty/eleventy-plugin-rss";

import { markdownLibrary, renderMarkdown, stripHeadings, readableDate, isoDate, limit } from "./lib/filters.mjs";
import { recentPosts, recentGigs, homePagePosts, featuredEntries } from "./lib/collections.mjs";
import { photoShortcode, videoShortcode } from "./lib/shortcodes.mjs";
import { slideshowShortcode } from "./lib/slideshow.mjs";
import { injectCspHashes } from "./lib/csp-hash.mjs";
import { parseSetlistIds, anyVisibleChip } from "./lib/setlist-ids.mjs";
import { siteStatsView } from "./lib/site-stats.mjs";
import { isArticle, metaDescription, ogImage, duplicateHeadValues } from "./lib/head-meta.mjs";
import { buildHubs, hubFor } from "./lib/hubs.mjs";
import { parseGigHistory } from "./lib/gig-history.mjs";

import site from "./content/_data/site.json" with { type: "json" };

export default function (eleventyConfig) {

  eleventyConfig.setLibrary("md", markdownLibrary);

  /*
    Serve the dev server over https so Safari doesn't warn on localhost (#186).
    Certs are generated locally with `npm run certs` (mkcert) into the
    gitignored .certs/ dir; when they're absent (CI, fresh clone) the dev
    server falls back to its default plain http.
  */
  const httpsKey = ".certs/localhost-key.pem";
  const httpsCert = ".certs/localhost.pem";
  if (existsSync(httpsKey) && existsSync(httpsCert)) {
    eleventyConfig.setServerOptions({
      https: { key: httpsKey, cert: httpsCert }
    });
  }

  // output everything from the static folder at root of output
  eleventyConfig.addPassthroughCopy({ static: "/" });

  /*
    Third-party assets copied out of node_modules rather than fetched from a
    CDN at page load. Copying from a pinned npm dependency means the version
    is in package-lock, Dependabot can see it, and there is no ad-hoc download
    step anyone has to remember.

    Pure.css was two unpkg requests on every pageview, and one of the two
    carried no SRI hash. Bebas Neue was an @import inside the stylesheet —
    a serial render-blocking fetch, since the browser could not discover the
    font until index.css had arrived.
  */
  eleventyConfig.addPassthroughCopy({
    "node_modules/purecss/build/pure-min.css": "vendor/pure-min.css",
    "node_modules/purecss/build/grids-responsive-min.css": "vendor/grids-responsive-min.css",
    "node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2":
      "fonts/bebas-neue-latin-400-normal.woff2",
    "node_modules/leaflet/dist/leaflet.js": "vendor/leaflet.js",
    "node_modules/leaflet/dist/leaflet.css": "vendor/leaflet.css"
  });

  /*
    The EXIF Viewer (/ExifCmdLine/) is a separate project — see
    github.com/adrianparker/ExifCmdLine. Its web bundle is a pinned npm
    dependency (see package.json); installing it builds web/dist via that
    repo's own `prepare` script, so this just copies the result out.
    Copying the assets directory only (not web/dist/index.html, which is
    that repo's own standalone HTML shell) avoids publishing an orphaned,
    unlinked duplicate of content/ExifCmdLine/index.njk — see #45.
  */
  eleventyConfig.addPassthroughCopy({
    "node_modules/exifcmdline/web/dist/assets": "dist/assets"
  });

  /*
    The Gig History's source files and their contract doc. gig-history.html is
    a standalone document written by a separate agent, gig-history.md is the
    gig data Adrian edits by hand, Locations.md is the venue coordinate lookup
    the map view joins against, setlist-songs.md is the per-song data behind
    the "Songs heard live" stats card, and Eleventy would otherwise treat all
    five markdown/HTML files — and the README — as templates, publishing
    orphaned, unlinked pages at /GigHistory/gig-history/, /GigHistory/Locations/,
    /GigHistory/setlist-songs/ and /GigHistory/README/. Same trap as the EXIF
    Viewer's own shell above (#45).

    The sources are not passthrough-copied either: content/_data/gigHistoryApp.mjs
    reads them at build time and embeds the result into the page, so nothing
    here needs to be served. Watched explicitly so `npm run serve` picks up
    edits, which it cannot infer from an ignored file.
  */
  eleventyConfig.ignores.add("content/GigHistory/gig-history.html");
  eleventyConfig.ignores.add("content/GigHistory/gig-history.md");
  eleventyConfig.ignores.add("content/GigHistory/Locations.md");
  eleventyConfig.ignores.add("content/GigHistory/setlist-songs.md");
  eleventyConfig.ignores.add("content/GigHistory/README.md");
  eleventyConfig.addWatchTarget("content/GigHistory/gig-history.html");
  eleventyConfig.addWatchTarget("content/GigHistory/gig-history.css");
  eleventyConfig.addWatchTarget("content/GigHistory/gig-history.md");
  eleventyConfig.addWatchTarget("content/GigHistory/Locations.md");
  eleventyConfig.addWatchTarget("content/GigHistory/setlist-songs.md");

  // render a markdown string as HTML in place
  eleventyConfig.addFilter("md", renderMarkdown);
  eleventyConfig.addFilter("stripHeadings", stripHeadings);

  // the site's one date format, used wherever a date is displayed
  eleventyConfig.addFilter("readableDate", readableDate);

  // YYYY-MM-DD, for the sitemap
  eleventyConfig.addFilter("isoDate", isoDate);

  // truncate a collection — the home page and feed are both capped
  eleventyConfig.addFilter("limit", limit);

  // parses a gig post's `setlistfm` front matter into a Map of performer
  // name -> { id, empty }, for the setlist chip next to each performer name
  eleventyConfig.addFilter("setlistIds", parseSetlistIds);

  // true if any of the given performer names has a visible (non-:empty)
  // setlist chip — gates whether a gig post needs the modal markup at all
  eleventyConfig.addFilter("anySetlistChip", anyVisibleChip);

  // turns the Site Stats snapshot (content/_data/siteStats.mjs) into what
  // the /Site-Stats/ templates draw
  eleventyConfig.addFilter("siteStatsView", siteStatsView);
  eleventyConfig.addFilter("isArticle", isArticle);
  eleventyConfig.addFilter("metaDescription", metaDescription);
  eleventyConfig.addFilter("ogImage", (page) => ogImage({
    ...page,
    siteUrl: site.url,
    mediaUrl: site.mediaUrl,
    defaultImage: "/img/Adrian-170x158.jpeg",
    defaultAlt: "Adrian Parker"
  }));

  /*
    A warning, not a failure (#252): two pages sharing a <title> or meta
    description compete with each other in search results.
  */
  eleventyConfig.on("eleventy.after", ({ results }) => {
    const { titles, descriptions } = duplicateHeadValues(results);
    for (const { value, urls } of titles) console.warn(`[head] duplicate <title> "${value}": ${urls.join(", ")}`);
    for (const { value, urls } of descriptions) console.warn(`[head] duplicate meta description "${value}": ${urls.join(", ")}`);
  });

  // enable RSS
  eleventyConfig.addPlugin(pluginRss);

  // makes the content before the <!-- excerpt --> of each post available
  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: "<!-- excerpt -->"
  });

  // sidebar navigation collections
  eleventyConfig.addCollection("recentPosts", recentPosts);
  eleventyConfig.addCollection("recentGigs", recentGigs);

  // posts and gigs merged, newest first, for the home page and RSS feed
  eleventyConfig.addCollection("homePagePosts", homePagePosts);

  /*
    Internal linking (#256). Hubs list an act's or venue's reviews plus its
    Gig History rows, read from the same gig-history.md the app embeds; only
    acts and venues with two or more reviews get one, so no hub is thin.
  */
  const gigHistoryRows = () => parseGigHistory(readFileSync("content/GigHistory/gig-history.md", "utf8"));
  eleventyConfig.addCollection("artistHubs", (api) => buildHubs(api.getFilteredByTag("gig"), gigHistoryRows(), "performer"));
  eleventyConfig.addCollection("venueHubs", (api) => buildHubs(api.getFilteredByTag("gig"), gigHistoryRows(), "venue"));
  eleventyConfig.addCollection("featured", (api) => featuredEntries(api.getFilteredByTag("post")));
  eleventyConfig.addFilter("hubFor", hubFor);

  // A photo from a set already published to the media bucket, referenced
  // as `<set-id>/<name>` — see README → Photos.
  eleventyConfig.addShortcode("image", (ref, alt, className) =>
    photoShortcode(site.mediaUrl, ref, alt, className)
  );
  eleventyConfig.addShortcode("video", videoShortcode);

  // Every photo in a published set as a swipeable strip — the gig layout
  // renders one for `photos:` front matter; posts can call it inline.
  eleventyConfig.addShortcode("slideshow", (setId, label) =>
    slideshowShortcode(site.mediaUrl, setId, label)
  );

  /*
    Runs on the fully rendered HTML of each page, not the templates, so it
    catches every inline <script>/<style> block regardless of which partial
    produced it — including ones that vary per page, like the embedded Gig
    Tracker's script and the appInlineStyles block (#100).
  */
  eleventyConfig.addTransform("csp-hash", function (content) {
    if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) return content;
    return injectCspHashes(content);
  });

  return {
    dir: {
      input: "content"
    }
  };
}
