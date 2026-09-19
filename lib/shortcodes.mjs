import { findPhoto, photoVariants } from "./photo-sets.mjs";

/** Widths the publish script generates and the image tag references, smallest first. */
export const IMAGE_WIDTHS = [400, 800];

/** Formats likewise. The last one is the <img> fallback. */
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
 * A <picture> with one <source> per format and a jpeg <img> fallback.
 * `imageMetadata` is in eleventy-img's shape, as photoVariants() produces it
 * from a set manifest:
 * `{ format: [{ url, width, height, sourceType, srcset }, ...] }`, smallest
 * first.
 *
 * Technique adapted from
 * https://www.aleksandrhovhannisyan.com/blog/eleventy-image-plugin/
 */
export function pictureElement(imageMetadata, alt, className = undefined, sizes = IMAGE_SIZES, loading = "lazy") {
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
    width: largestJpeg.width,
    height: largestJpeg.height,
    loading,
    decoding: "async"
  });
  const imgHtmlString = `<img ${imgAttributes}>`;
  const pictureAttributes = stringifyAttributes({
    class: className
  });

  return `<picture ${pictureAttributes}>
    ${sourceHtmlString}
    ${imgHtmlString}
  </picture>`;
}

/**
 * A <figure> around pictureElement() plus a <figcaption>.
 *
 * Note the alt text is deliberately rendered as the visible caption as well,
 * so it has to read as a caption, not just as a description.
 */
export function pictureHtml(imageMetadata, alt, className = undefined, sizes = IMAGE_SIZES) {
  return `<figure>${pictureElement(imageMetadata, alt, className, sizes)}<figcaption>${alt}</figcaption></figure>`;
}

/**
 * A photo already published to the media bucket, referenced as
 * `<set-id>/<name>` — e.g. `Last-Ever-Last-Ever/IMG_9410`, with every URL
 * on `mediaUrl`. This is the `image` tag.
 */
export function photoShortcode(mediaUrl, ref, alt, className = undefined, setsDir = undefined) {
  const slash = ref.indexOf("/");
  if (slash < 1 || slash === ref.length - 1) {
    throw new Error(`Photo reference "${ref}" must be "<set-id>/<name>"`);
  }
  const setId = ref.slice(0, slash);
  const name = ref.slice(slash + 1);
  const photo = findPhoto(setId, name, setsDir);
  return pictureHtml(photoVariants(mediaUrl, setId, photo, IMAGE_WIDTHS, IMAGE_FORMATS), alt, className);
}

/**
 * A responsive 16:9 wrapper around a <video>, framed with a border so it
 * reads as an embedded player rather than bare page content. An optional
 * label renders as an icon+text badge over the top-left corner, clear of
 * the browser's own centered play control.
 *
 * `poster || undefined` (rather than the bare parameter) lets a call pass
 * `""` to skip the poster while still reaching `label` positionally.
 */
export const videoShortcode = (src, type = "video/mp4", poster = undefined, label = undefined) => {
  const videoAttributes = stringifyAttributes({
    controls: "controls",
    preload: "metadata",
    poster: poster || undefined
  });
  const sourceHtmlString = `<source src="${src}" type="${type}"/>`;
  const fallbackText = "Your browser does not support the video tag.";
  const labelHtmlString = label
    ? `<p class="video-label"><span class="video-label-icon" aria-hidden="true"></span>${label}</p>`
    : "";

  const video = `<video ${videoAttributes}>
    ${sourceHtmlString}
    ${fallbackText}
  </video>`;

  return `<div class="video-wrapper-frame"><div class="video-wrapper">${video}${labelHtmlString}</div></div>`;
};
