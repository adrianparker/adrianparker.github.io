import pluginRss from "@11ty/eleventy-plugin-rss";

import { markdownLibrary, renderMarkdown, readableDate, isoDate, limit } from "./lib/filters.mjs";
import { recentPosts, recentGigs, homePagePosts } from "./lib/collections.mjs";
import { imageShortcode, videoShortcode } from "./lib/shortcodes.mjs";

export default function (eleventyConfig) {

  eleventyConfig.setLibrary("md", markdownLibrary);

  // output everything from the static folder at root of output
  eleventyConfig.addPassthroughCopy({ static: "/" });

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
