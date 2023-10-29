const markdownIt = require("markdown-it");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const Image = require("@11ty/eleventy-img");
const outdent = require('outdent');


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
      var recentPosts= collectionApi.getFilteredByTag("post").reverse();
      if (recentPosts.length > 3){
        recentPosts.length = 3;
      }
      return recentPosts;
    });

    // set up the image shortcode for use in nunjucks templates
    eleventyConfig.addShortcode("image", imageShortcode);
  };

/**
 * Implement the image shortcode. Technique borrowed from https://www.aleksandrhovhannisyan.com/blog/eleventy-image-plugin/
 */
const imageShortcode = async (
  src,
  alt,
  className = undefined,
  widths = [400, 800],
  formats = ['webp', 'jpeg'],
  sizes = '100vw'
) => {
  const imageMetadata = await Image(src, {
    widths: [...widths],
    formats: [...formats],
    outputDir: "_site/img/"
  });

  const sourceHtmlString = Object.values(imageMetadata)
    .map((images) => {
      const { sourceType } = images[0];
      const sourceAttributes = stringifyAttributes({
        type: sourceType,
        srcset: images.map((image) => image.srcset).join(', '),
        sizes,
      });
      // Return one <source> per format
      return `<source ${sourceAttributes}>`;
    })
    .join('\n');

  const getLargestImage = (format) => {
    const images = imageMetadata[format];
    return images[images.length - 1];
  }

  const largestUnoptimizedImg = getLargestImage(formats[0]);
  const imgAttributes = stringifyAttributes({
    src: largestUnoptimizedImg.url,
    width: largestUnoptimizedImg.width,
    height: largestUnoptimizedImg.height,
    alt,
    loading: 'lazy',
    decoding: 'async',
  });
  const imgHtmlString = `<img ${imgAttributes}>`;

  const pictureAttributes = stringifyAttributes({
    class: className,
  });
  const picture = `<picture ${pictureAttributes}>
    ${sourceHtmlString}
    ${imgHtmlString}
  </picture>`;

  return outdent`${picture}`;
};

/** 
 * Maps a config of attribute-value pairs to an HTML string representing those same attribute-value pairs.
 */
const stringifyAttributes = (attributeMap) => {
  return Object.entries(attributeMap)
    .map(([attribute, value]) => {
      if (typeof value === 'undefined') return '';
      return `${attribute}="${value}"`;
    })
    .join(' ');
};
