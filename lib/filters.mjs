import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";

/**
 * markdown-it's table rule renders column alignment (`:---`, `---:`, `:---:`)
 * as a `style="text-align:…"` attribute directly on each `<th>`/`<td>`. That
 * is an inline style attribute, which the site's CSP cannot cover with a
 * build-time hash (see lib/csp-hash.mjs) — only a fixed, pre-known value can
 * be hashed, and every table's cells differ. Rewriting it to a class here,
 * once, keeps markdown table alignment working without weakening the CSP
 * for every post that happens to use one (#100). The three classes this
 * produces (ta-left/ta-right/ta-center) are styled in static/index.css.
 */
function tableAlignmentClasses(state) {
  for (const token of state.tokens) {
    if (token.type !== "th_open" && token.type !== "td_open") continue;
    const style = token.attrGet("style");
    if (!style) continue;
    const align = style.replace("text-align:", "");
    token.attrSet("class", `ta-${align}`);
    token.attrs = token.attrs.filter(([name]) => name !== "style");
  }
}

/**
 * The site's markdown renderer. Shared by the `md` filter and by the
 * library Eleventy uses for .md files, so both behave identically.
 */
export const markdownLibrary = markdownIt({ html: true }).use(markdownItFootnote);

markdownLibrary.core.ruler.push("table-alignment-classes", tableAlignmentClasses);

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
