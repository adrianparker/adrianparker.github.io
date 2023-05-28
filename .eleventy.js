const markdownIt = require("markdown-it");
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {

    // output everything from the static folder at root of output
    eleventyConfig.addPassthroughCopy({ static: "/" });

    // can use the shortcode 'md' in a page to render markdown copy as HTML in place
    eleventyConfig.addFilter("md", function (content = "") {
      return markdownIt({ html: true }).render(content);
    });

    // enable RSS
    eleventyConfig.addPlugin(pluginRss);

    // makes the content before the <!-- excerpt --> of each post available
    eleventyConfig.setFrontMatterParsingOptions({
      excerpt: true,
      excerpt_separator: "<!-- excerpt -->"
    });

    // add up to 3 most recent posts collection to global scope for base template to use on each page nav
    eleventyConfig.addCollection("recentPosts", function(collectionApi) {
      var recentPosts= collectionApi.getFilteredByTag("popular").reverse();
      if (recentPosts.length > 3){
        recentPosts.length = 3;
      }
      return recentPosts;
    });

  };