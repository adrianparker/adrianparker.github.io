/*
  Extracts the rendered-text portions of a post/gig markdown file that are
  worth spell checking, stripping out everything that isn't prose: YAML
  front matter, Nunjucks tags/shortcodes, HTML tags/comments (except cspell
  directive comments, which cspell itself needs to see), and URLs.
*/

const FRONT_MATTER = /^---\n[\s\S]*?\n---\n?/;
const NUNJUCKS_TAG = /{%[\s\S]*?%}/g;
const NUNJUCKS_EXPRESSION = /{{[\s\S]*?}}/g;
const CSPELL_COMMENT = /<!--\s*cspell:[\s\S]*?-->/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HTML_TAG = /<[^>]*>/g;
const URL = /https?:\/\/\S+/g;

/**
 * Replaces every character of `match` with a space, except newlines, which
 * are kept as-is — so removing a multi-line match doesn't shift the line
 * numbers of anything after it.
 */
function blank (match) {
  return match.replace(/[^\n]/g, " ");
}

/**
 * Removes a leading YAML front matter block (`---` ... `---`), if present.
 */
export function stripFrontMatter (markdown) {
  return markdown.replace(FRONT_MATTER, blank);
}

/**
 * Removes Nunjucks tags (`{% ... %}`) and expressions (`{{ ... }}`).
 */
export function stripNunjucks (markdown) {
  return markdown.replace(NUNJUCKS_TAG, blank).replace(NUNJUCKS_EXPRESSION, blank);
}

/**
 * Removes HTML tags and comments, but preserves `<!-- cspell:... -->`
 * directive comments so cspell can still read them.
 */
export function stripHtml (markdown) {
  const placeholders = [];
  const withPlaceholders = markdown.replace(CSPELL_COMMENT, (match) => {
    placeholders.push(match);
    return `\u0000${placeholders.length - 1}\u0000`;
  });

  const stripped = withPlaceholders
    .replace(HTML_COMMENT, blank)
    .replace(HTML_TAG, blank);

  return stripped.replace(/\u0000(\d+)\u0000/g, (_match, index) => placeholders[Number(index)]);
}

/**
 * Removes bare URLs (`http://` / `https://` up to the next whitespace).
 */
export function stripUrls (markdown) {
  return markdown.replace(URL, blank);
}

/**
 * Extracts the text of a post/gig markdown file worth spell checking:
 * front matter, Nunjucks, HTML tags/comments, and URLs are all stripped,
 * leaving prose (plus any `<!-- cspell:words ... -->` directive comments).
 */
export function extractSpellcheckText (markdown) {
  return stripUrls(stripHtml(stripNunjucks(stripFrontMatter(markdown))));
}
