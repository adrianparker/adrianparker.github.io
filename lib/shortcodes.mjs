import Image from "@11ty/eleventy-img";

/** Widths the image shortcode generates, smallest first. */
export const IMAGE_WIDTHS = [400, 800];

/** Formats the image shortcode generates. The last one is the <img> fallback. */
export const IMAGE_FORMATS = ["webp", "jpeg"];

/**
 * Default `sizes` attribute, describing the image's actual rendered width
 * rather than a layout breakpoint pixel value. Below the site's single
 * breakpoint (47.999em, matching static/index.css) the image spans nearly
 * the full viewport; above it, it sits in the 75%-wide content column with
 * 4% padding either side, which is roughly 68vw. Capped implicitly by the
 * largest generated width in IMAGE_WIDTHS.
 */
export const IMAGE_SIZES = "(max-width: 47.999em) 100vw, 68vw";

/** Where generated images are written. Overridable so tests need not write into _site. */
export const IMAGE_OUTPUT_DIR = "_site/img/";

/**
 * Maps attribute-value pairs to an HTML attribute string. Pairs whose value
 * is undefined are omitted entirely, which is how optional attributes such
 * as `poster` and `class` are left off.
 */
export function stringifyAttributes(attributeMap) {
  return Object.entries(attributeMap)
    .map(([attribute, value]) => {
      if (typeof value === "undefined") return "";
      return `${attribute}="${value}"`;
    })
    .join(" ");
}

/**
 * A <figure> containing a <picture> with one <source> per format and a jpeg
 * <img> fallback, plus a <figcaption>.
 *
 * Note the alt text is deliberately rendered as the visible caption as well,
 * so it has to read as a caption, not just as a description.
 *
 * Technique adapted from
 * https://www.aleksandrhovhannisyan.com/blog/eleventy-image-plugin/
 */
export const imageShortcode = async (
  src,
  alt,
  className = undefined,
  widths = IMAGE_WIDTHS,
  formats = IMAGE_FORMATS,
  sizes = IMAGE_SIZES,
  outputDir = IMAGE_OUTPUT_DIR
) => {
  const imageMetadata = await Image(src, {
    widths: [...widths],
    formats: [...formats],
    outputDir
  });

  const sourceHtmlString = Object.values(imageMetadata)
    .map((images) => {
      const { sourceType } = images[0];
      const sourceAttributes = stringifyAttributes({
        type: sourceType,
        srcset: images.map((image) => image.srcset).join(", "),
        sizes: sizes
      });
      return `<source ${sourceAttributes}>`;
    })
    .join("\n");

  const getLargestImage = (format) => {
    const images = imageMetadata[format];
    return images[images.length - 1];
  };

  const largestJpeg = getLargestImage("jpeg");
  const imgAttributes = stringifyAttributes({
    src: largestJpeg.url,
    alt,
    loading: "lazy",
    decoding: "async"
  });
  const imgHtmlString = `<img ${imgAttributes}>`;
  const pictureAttributes = stringifyAttributes({
    class: className
  });

  return `<figure><picture ${pictureAttributes}>
    ${sourceHtmlString}
    ${imgHtmlString}
  </picture><figcaption>${alt}</figcaption></figure>`;
};

/**
 * A responsive 16:9 wrapper around a <video>. The wrapper is what the
 * stylesheet targets for aspect ratio, so the markup shape matters.
 */
export const videoShortcode = (src, type = "video/mp4", poster = undefined) => {
  const videoAttributes = stringifyAttributes({
    controls: "controls",
    preload: "metadata",
    poster: poster
  });
  const sourceHtmlString = `<source src="${src}" type="${type}"/>`;
  const fallbackText = "Your browser does not support the video tag.";

  const video = `<video ${videoAttributes}>
    ${sourceHtmlString}
    ${fallbackText}
  </video>`;

  return `<div class="video-wrapper">${video}</div>`;
};
