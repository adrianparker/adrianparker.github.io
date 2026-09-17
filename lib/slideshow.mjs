import { pictureElement, stringifyAttributes, IMAGE_WIDTHS, IMAGE_FORMATS } from "./shortcodes.mjs";
import { loadPhotoSet, photoVariants } from "./photo-sets.mjs";

/** The script that turns the strip into a slideshow. Served from static/. */
export const SLIDESHOW_SCRIPT = "/slideshow.js";

/**
 * Shortcode output is not autoescaped by either template engine, and gig
 * titles carry ampersands ("Teen Jesus & the Jean Teasers"), so anything
 * that lands in an attribute or caption goes through here.
 */
export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * A horizontal strip of a set's photos — one <figure> per photo inside a
 * scroll-snap track — framed like the video embed so the two kinds of media
 * read as a pair.
 *
 * It works with no JavaScript: the strip scrolls and swipes natively, the
 * badge says how many photos there are, and the browser's own scrollbar
 * shows there is more. static/slideshow.js then reveals the prev/next
 * buttons and turns the badge into a "3 / 24" counter.
 *
 * Only the first photo loads eagerly; the rest are `loading="lazy"`, which
 * browsers honour for off-screen slides in a horizontal scroller too.
 *
 * A photo's `caption` (hand-added to the manifest) becomes both its alt
 * text and a visible figcaption; without one, the alt names the photo's
 * place in the set so a screen reader still gets something meaningful.
 */
export function slideshowShortcode(mediaUrl, setId, label, setsDir = undefined) {
  const { photos } = loadPhotoSet(setId, setsDir);
  if (photos.length === 0) {
    throw new Error(`Photo set "${setId}" is empty`);
  }

  const total = photos.length;
  const slides = photos.map((photo, i) => {
    const alt = photo.caption ?? `${label}, photo ${i + 1} of ${total}`;
    const picture = pictureElement(
      photoVariants(mediaUrl, setId, photo, IMAGE_WIDTHS, IMAGE_FORMATS),
      escapeHtml(alt),
      undefined,
      undefined,
      i === 0 ? "eager" : "lazy"
    );
    const caption = photo.caption
      ? `<figcaption class="slideshow-caption">${escapeHtml(photo.caption)}</figcaption>`
      : "";
    const slideAttributes = stringifyAttributes({
      class: "slideshow-slide",
      "aria-label": `Photo ${i + 1} of ${total}`
    });
    return `<figure ${slideAttributes}>${picture}${caption}</figure>`;
  });

  const trackAttributes = stringifyAttributes({
    class: "slideshow-track",
    tabindex: "0",
    "aria-label": escapeHtml(`Photos: ${label}`)
  });

  return `<div class="slideshow" data-slideshow>
  <div class="slideshow-frame">
    <div ${trackAttributes}>
      ${slides.join("\n      ")}
    </div>
    <button type="button" class="slideshow-prev" aria-label="Previous photo"><span aria-hidden="true">&lsaquo;</span></button>
    <button type="button" class="slideshow-next" aria-label="Next photo"><span aria-hidden="true">&rsaquo;</span></button>
    <p class="slideshow-status" aria-live="polite">${total} photos</p>
  </div>
</div>
<script src="${SLIDESHOW_SCRIPT}" defer></script>`;
}
