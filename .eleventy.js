module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ static: "/" });
    eleventyConfig.setFrontMatterParsingOptions({
      excerpt: true,
      excerpt_separator: "<!-- excerpt -->"
    });
    eleventyConfig.addCollection("popularPosts", function(collectionApi) {
      return collectionApi.getFilteredByTag("popular");
    });
    eleventyConfig.addCollection("recentPosts", function(collectionApi) {
      var recentPosts= collectionApi.getFilteredByTag("popular").reverse();
      if (recentPosts.length > 3){
        recentPosts.length = 3;
      }
      return recentPosts;
    });

  };