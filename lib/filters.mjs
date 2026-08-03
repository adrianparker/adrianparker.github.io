import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";

/**
 * The site's markdown renderer. Shared by the `md` filter and by the
 * library Eleventy uses for .md files, so both behave identically.
 */
export const markdownLibrary = markdownIt({ html: true }).use(markdownItFootnote);

/**
 * Renders a markdown string to HTML in place. Exposed as the `md` filter so
 * a template can render markdown held in front matter or data.
 */
export function renderMarkdown(content = "") {
  return markdownLibrary.render(content);
}

/**
 * Formats a date the way the site displays it everywhere:
 * "Sunday, 19 July 2026".
 *
 * This expression was previously inlined in six places across five
 * templates. Anything wanting a displayed date should use this.
 */
/**
 * The first `count` items of an array, without mutating it.
 *
 * Nunjucks has no Python-style slicing and its built-in `slice` filter splits
 * an array into N chunks rather than truncating, which is a trap worth
 * avoiding in a template.
 */
export function limit(array, count) {
  if (!Array.isArray(array)) {
    throw new TypeError(`limit expects an array, received: ${typeof array}`);
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError(`limit expects a non-negative integer count, received: ${count}`);
  }
  return array.slice(0, count);
}

/**
 * Formats a date as YYYY-MM-DD, the W3C Datetime form sitemaps use for
 * <lastmod>. Deliberately date-only: the time of day is noise for a sitemap
 * and would change the file on every rebuild.
 */
export function isoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError(`isoDate expects a valid Date, received: ${date}`);
  }
  return date.toISOString().slice(0, 10);
}

export function readableDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError(`readableDate expects a valid Date, received: ${date}`);
  }
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
