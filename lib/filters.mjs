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
