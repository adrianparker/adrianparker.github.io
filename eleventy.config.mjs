import pluginRss from "@11ty/eleventy-plugin-rss";

import { markdownLibrary, renderMarkdown, readableDate, isoDate, limit } from "./lib/filters.mjs";
import { recentPosts, recentGigs, homePagePosts } from "./lib/collections.mjs";
import { imageShortcode, videoShortcode } from "./lib/shortcodes.mjs";

export default function (eleventyConfig) {

  eleventyConfig.setLibrary("md", markdownLibrary);

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
    "node_modules/@fontsource/kalam/files/kalam-latin-700-normal.woff2":
      "fonts/kalam-latin-700-normal.woff2"
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
    The Gig Tracker's source files and their contract doc. gig-history.html is
    a standalone document written by a separate agent, gig-history.md is the
    gig data Adrian edits by hand, and Eleventy would otherwise treat all
    three markdown/HTML files — and the README — as templates, publishing
    orphaned, unlinked pages at /GigTracker/gig-history/ and
    /GigTracker/README/. Same trap as the EXIF Viewer's own shell above (#45).

    The sources are not passthrough-copied either: content/_data/gigTrackerApp.mjs
    reads them at build time and embeds the result into the page, so nothing
    here needs to be served. Watched explicitly so `npm run serve` picks up
    edits, which it cannot infer from an ignored file.
  */
  eleventyConfig.ignores.add("content/GigTracker/gig-history.html");
  eleventyConfig.ignores.add("content/GigTracker/gig-history.md");
  eleventyConfig.ignores.add("content/GigTracker/README.md");
  eleventyConfig.addWatchTarget("content/GigTracker/gig-history.html");
  eleventyConfig.addWatchTarget("content/GigTracker/gig-history.css");
  eleventyConfig.addWatchTarget("content/GigTracker/gig-history.md");

  // render a markdown string as HTML in place
  eleventyConfig.addFilter("md", renderMarkdown);

  // the site's one date format, used wherever a date is displayed
  eleventyConfig.addFilter("readableDate", readableDate);

  // YYYY-MM-DD, for the sitemap
  eleventyConfig.addFilter("isoDate", isoDate);

  // truncate a collection — the home page and feed are both capped
  eleventyConfig.addFilter("limit", limit);

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

  eleventyConfig.addShortcode("image", imageShortcode);
  eleventyConfig.addShortcode("video", videoShortcode);

  return {
    dir: {
      input: "content"
    }
  };
}
