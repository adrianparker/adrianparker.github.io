const markdownIt = require("markdown-it");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const Image = require("@11ty/eleventy-img");

module.exports = function (eleventyConfig) {

    // output everything from the static folder at root of output
    eleventyConfig.addPassthroughCopy({ static: "/" });
    eleventyConfig.addPassthroughCopy({ "content/posts/img/": "/" });

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
      var recentPosts= collectionApi.getFilteredByTag("post").reverse();
      if (recentPosts.length > 3){
        recentPosts.length = 3;
      }
      return recentPosts;
    });

    // set up the image shortcode for use in nunjucks templates
    eleventyConfig.addShortcode("image", async function(src, alt, sizes) {
      let metadata = await Image(src, {
        widths: [300, 600],
        formats: ["jpeg"],
        outputDir: "_site/img/"
      });
  
      let imageAttributes = {
        alt,
        sizes,
        loading: "lazy",
        decoding: "async",
      };
  
      // throws an error on missing alt (alt="" works okay) or missing sizes
      return Image.generateHTML(metadata, imageAttributes);
    });
  };