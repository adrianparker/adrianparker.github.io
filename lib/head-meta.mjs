/*
  The values behind the <head> social and search metadata (#252): which
  description a page advertises, which image represents it, and a build-time
  check for pages that share a title or description.
*/

/** Tags that make a page an article for og:type, rather than a website. */
const ARTICLE_TAGS = ["post", "gig"];

/** True for posts and gig reviews. */
export function isArticle(tags) {
  return Array.isArray(tags) && tags.some((t) => ARTICLE_TAGS.includes(t));
}

/** Strips tags and collapses whitespace, for HTML-bearing front matter. */
function plainText(str) {
  return String(str).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** A summary this long already makes a full meta description on its own. */
export const FULL_DESCRIPTION_LENGTH = 120;

/**
 * The page's meta/og/twitter description.
 *
 * Gig reviews lead with their one-line `summary`, so they no longer all open
 * with the same templated "Concert review of X at Y, date." sentence. Most
 * gig summaries are short and some do not name the act ("The legend in his
 * prime"), so a summary under FULL_DESCRIPTION_LENGTH is followed by that
 * factual sentence rather than replacing it. Everything else uses
 * `metadesc`, falling back to `summary`.
 */
export function metaDescription({ tags, metadesc, summary }) {
  const isGig = Array.isArray(tags) && tags.includes("gig");
  if (isGig && summary) {
    const lead = plainText(summary);
    if (lead.length >= FULL_DESCRIPTION_LENGTH || !metadesc) return lead;
    return `${/[.!?]$/.test(lead) ? lead : `${lead}.`} ${plainText(metadesc)}`;
  }
  const first = metadesc || summary;
  return first ? plainText(first) : "";
}

/**
 * The first image in rendered page content that the site itself serves:
 * a root-relative path or a file on `mediaUrl`. Third-party images (the
 * setlist.fm widget) are skipped. Returns `{ src, alt }` or null.
 */
export function firstContentImage(html, mediaUrl) {
  for (const [tag] of String(html ?? "").matchAll(/<img\b[^>]*>/gi)) {
    const src = /\ssrc="([^"]+)"/i.exec(tag)?.[1];
    if (!src || !(src.startsWith(mediaUrl) || /^\/(?!\/)/.test(src))) continue;
    if (src === "/blank.gif") continue;
    const alt = /\salt="([^"]*)"/i.exec(tag)?.[1] ?? "";
    return { src, alt };
  }
  return null;
}

/**
 * The page's og:image, absolute, with its alt text and whether it is a real
 * content image (worth a large Twitter card) or the site's default portrait.
 * Order: front matter `image`, then the first content image, then the default.
 */
export function ogImage({ image, imageAlt, title, content, siteUrl, mediaUrl, defaultImage, defaultAlt }) {
  const absolute = (src) => (src.startsWith("/") ? `${siteUrl}${src}` : src);
  if (image) return { url: absolute(image), alt: imageAlt || title || defaultAlt, large: true };
  const found = firstContentImage(content, mediaUrl);
  if (found) return { url: absolute(found.src), alt: found.alt || title || defaultAlt, large: true };
  return { url: absolute(defaultImage), alt: defaultAlt, large: false };
}

/**
 * Titles and meta descriptions shared by more than one built page, read from
 * rendered output as `[{ url, content }]`. Redirect stubs are skipped: they
 * all share "Redirecting…" by design. Returns `{ titles, descriptions }`,
 * each an array of `{ value, urls }`.
 */
export function duplicateHeadValues(pages) {
  const titles = new Map();
  const descriptions = new Map();
  const add = (map, value, url) => {
    if (!value) return;
    map.set(value, [...(map.get(value) ?? []), url]);
  };
  for (const { url, content } of pages) {
    if (typeof content !== "string" || content.includes('http-equiv="refresh"')) continue;
    add(titles, /<title>([^<]*)<\/title>/i.exec(content)?.[1].trim(), url);
    add(descriptions, /<meta name="description" content="([^"]*)"/i.exec(content)?.[1].trim(), url);
  }
  const dupes = (map) => [...map].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
  return { titles: dupes(titles), descriptions: dupes(descriptions) };
}
