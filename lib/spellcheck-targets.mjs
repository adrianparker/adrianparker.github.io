/*
  Extracts the rendered-text portions of a post/gig markdown file that are
  worth spell checking, stripping out everything that isn't prose: YAML
  front matter, Nunjucks tags/shortcodes, HTML tags/comments (except cspell
  directive comments, which cspell itself needs to see), URLs, and HTML
  entities — plus normalising curly apostrophes to straight ones so cspell
  doesn't split contractions on them.
*/

const FRONT_MATTER = /^---\n[\s\S]*?\n---\n?/;
const NUNJUCKS_TAG = /{%[\s\S]*?%}/g;
const NUNJUCKS_EXPRESSION = /{{[\s\S]*?}}/g;
const CSPELL_COMMENT = /<!--\s*cspell:[\s\S]*?-->/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HTML_TAG = /<[^>]*>/g;
const URL = /https?:\/\/\S+/g;
const CURLY_APOSTROPHE = /[‘’]/g;
const NAMED_ENTITY = /&([a-zA-Z]+);/g;
const NUMERIC_ENTITY = /&#(\d+);/g;
const HEX_ENTITY = /&#x([0-9a-fA-F]+);/g;

// Only the handful of entities actually seen in this blog's prose. Anything
// else numeric is decoded via its code point; anything else named is
// blanked rather than guessed at, so an unknown entity can't leak into the
// spell check as a fake word like "nbsp" or "apos".
const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " "
};

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
 * Replaces curly/smart apostrophes (`'` `'`) with a straight `'`, so
 * contractions like "wasn't" aren't split into "wasn" by a quote mark
 * cspell doesn't treat as part of the word.
 */
export function normalizeApostrophes (markdown) {
  return markdown.replace(CURLY_APOSTROPHE, "'");
}

/**
 * Decodes the handful of HTML entities this blog's prose actually uses
 * (`&amp;`, `&nbsp;`, ...) and numeric/hex entities (`&#39;`, `&#x27;`) to
 * their character. Any other named entity is blanked rather than guessed
 * at, so it can't leak into the spell check as a fake word.
 */
export function stripHtmlEntities (markdown) {
  return markdown
    .replace(HEX_ENTITY, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(NUMERIC_ENTITY, (_match, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(NAMED_ENTITY, (match, name) => Object.hasOwn(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : blank(match));
}

/**
 * Extracts the text of a post/gig markdown file worth spell checking:
 * front matter, Nunjucks, HTML tags/comments, HTML entities, and URLs are
 * all stripped, and curly apostrophes normalised, leaving prose (plus any
 * `<!-- cspell:words ... -->` directive comments).
 */
export function extractSpellcheckText (markdown) {
  return stripUrls(stripHtmlEntities(stripHtml(stripNunjucks(stripFrontMatter(normalizeApostrophes(markdown))))));
}
