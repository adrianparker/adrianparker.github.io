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
 * badge says how many photos there are and what they are of, and the
 * browser's own scrollbar shows there is more. static/slideshow.js then
 * reveals the prev/next buttons (which wrap around at either end) and turns
 * the count into a "3 / 24" position, leaving the label beside it.
 *
 * Only the first photo loads eagerly; the rest are `loading="lazy"`, which
 * browsers honour for off-screen slides in a horizontal scroller too.
 *
 * A photo's `caption` (hand-added to the manifest) becomes both its alt
 * text and a visible figcaption; without one, the alt names the photo's
 * place in the set so a screen reader still gets something meaningful.
 *
 * Captions are often shared by every photo of one act ("Shihad at Meow Nui,
 * Wellington on March 16 2025" sixteen times). A caption used more than once
 * in the set gets ", photo N of M" on its alt, so no two images on a page
 * share alt text (#258); the visible figcaption stays as written.
 */
export function slideshowShortcode(mediaUrl, setId, label, setsDir = undefined) {
  const { photos } = loadPhotoSet(setId, setsDir);
  if (photos.length === 0) {
    throw new Error(`Photo set "${setId}" is empty`);
  }

  const total = photos.length;
  const captionUses = new Map();
  for (const { caption } of photos) {
    if (caption) captionUses.set(caption, (captionUses.get(caption) ?? 0) + 1);
  }
  const slides = photos.map((photo, i) => {
    const position = `photo ${i + 1} of ${total}`;
    const alt = !photo.caption
      ? `${label}, ${position}`
      : captionUses.get(photo.caption) > 1 ? `${photo.caption}, ${position}` : photo.caption;
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
    <p class="slideshow-status" aria-live="polite"><span class="slideshow-count">${total} photos</span> - ${escapeHtml(label)}</p>
  </div>
</div>
<script src="${SLIDESHOW_SCRIPT}" defer></script>`;
}
