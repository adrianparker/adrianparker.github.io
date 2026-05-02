const markdownIt = require("markdown-it");
const markdownItFootnote = require("markdown-it-footnote");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const Image = require("@11ty/eleventy-img");
const outdent = require('outdent');


module.exports = function (eleventyConfig) {

    let markdownLibrary = markdownIt({
      html: true
    })
    .use(markdownItFootnote);
  
    eleventyConfig.setLibrary("md", markdownLibrary);

    // output everything from the static folder at root of output
    eleventyConfig.addPassthroughCopy({ static: "/" });
    
    // can use the shortcode 'md' in a page to render markdown copy as HTML in place
    eleventyConfig.addFilter("md", function (content = "") {
      return markdownIt({ html: true }).use(markdownItFootnote).render(content);
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

    // add up to 3 most recent gig posts collection to global scope for base template sidebar
    eleventyConfig.addCollection("recentGigs", function(collectionApi) {
      var recentGigs = collectionApi.getFilteredByTag("gig").reverse();
      if (recentGigs.length > 3) {
        recentGigs.length = 3;
      }
      return recentGigs;
    });

    // merged collection of posts and gigs sorted by date descending, for home page and RSS feed
    eleventyConfig.addCollection("homePagePosts", function(collectionApi) {
      var posts = collectionApi.getFilteredByTag("post");
      var gigs = collectionApi.getFilteredByTag("gig");
      return posts.concat(gigs).sort(function(a, b) {
        return b.date - a.date;
      });
    });

    // set up the image shortcode for use in nunjucks templates
    eleventyConfig.addShortcode("image", imageShortcode);

    // set up the video shortcode for use in nunjucks templates
    eleventyConfig.addShortcode("video", videoShortcode);
  };

/**
 * Implement the image shortcode. Technique adapted from https://www.aleksandrhovhannisyan.com/blog/eleventy-image-plugin/ .
 * Returns a figure tag containing a picture tag, which has webp and jpeg sources with an img tag fallback to jpeg, and a figcaption the same as the alt text.
 */
const imageShortcode = async (
  src,
  alt,
  className = undefined,
  widths = [400, 800],
  formats = ['webp','jpeg'],
  sizes = '(max-width: 768px) 400px, 800px'
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
        sizes: sizes
      });
      // Return one <source> per format
      return `<source ${sourceAttributes}>`;
    })
    .join('\n');

  const getLargestImage = (format) => {
    const images = imageMetadata[format];
    return images[images.length - 1];
  }

  const largestJpeg = getLargestImage('jpeg');
  const imgAttributes = stringifyAttributes({
    src: largestJpeg.url,
    alt,
    loading: 'lazy',
    decoding: 'async'
  });
  const imgHtmlString = `<img ${imgAttributes}>`;
  const pictureAttributes = stringifyAttributes({
    class: className,
  });
  const figure = `<figure><picture ${pictureAttributes}>
    ${sourceHtmlString}
    ${imgHtmlString}
  </picture><figcaption>${alt}</figcaption></figure>`;

  return figure;
};

/**
 * Implement the video shortcode.
 * Returns a responsive video wrapper div with proper aspect ratio, containing a video element.
 */
const videoShortcode = (src, type = 'video/mp4', poster = undefined) => {
  const videoAttributes = stringifyAttributes({
    controls: 'controls',
    preload: 'metadata',
    poster: poster
  });
  const sourceHtmlString = `<source src="${src}" type="${type}"/>`;
  const fallbackText = 'Your browser does not support the video tag.';
  
  const video = `<video ${videoAttributes}>
    ${sourceHtmlString}
    ${fallbackText}
  </video>`;

  return `<div class="video-wrapper">${video}</div>`;
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
