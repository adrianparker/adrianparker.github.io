import { createHash } from "node:crypto";

/*
  Replaces 'unsafe-inline' in the page's CSP meta tag with sha256 hashes of
  that page's own inline <script>/<style> blocks, computed from the final
  rendered HTML.

  Working from the rendered output rather than the source templates is what
  makes this correct for content injected per page — the appInlineStyles
  <style> block in head.njk, and the embedded Gig Tracker's own <script>,
  both vary by page and cannot be hashed once for the whole site (see #100).

  A hash source only satisfies elements with a byte-identical body, so a tag
  with a src (an external script) has nothing to hash and is left alone —
  it is already covered by the CSP's host list, not by 'unsafe-inline'.
*/

const CSP_META = /(<meta http-equiv="Content-Security-Policy" content=")([^"]*)("[^>]*>)/;
const SCRIPT_BLOCK = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const STYLE_BLOCK = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
const HAS_SRC = /\bsrc\s*=/i;
const STYLE_ATTRIBUTE = /\bstyle\s*=\s*["']/i;

function hash(content) {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

/**
 * The sha256 hash sources for every inline (no-src) <script> and <style>
 * block in the given HTML, each appearing once regardless of repeats.
 */
export function extractInlineHashes(html) {
  const scriptHashes = new Set();
  const styleHashes = new Set();

  for (const [, attrs, content] of html.matchAll(SCRIPT_BLOCK)) {
    if (HAS_SRC.test(attrs) || content === "") continue;
    scriptHashes.add(hash(content));
  }

  for (const [, , content] of html.matchAll(STYLE_BLOCK)) {
    if (content === "") continue;
    styleHashes.add(hash(content));
  }

  return {
    scriptHashes: [...scriptHashes],
    styleHashes: [...styleHashes]
  };
}

/**
 * Swaps 'unsafe-inline' for the given hash sources within one CSP directive
 * (e.g. "'self' 'unsafe-inline' https://example.com"). Directives without
 * 'unsafe-inline' are returned unchanged — img-src and friends never had it.
 */
function replaceUnsafeInline(directiveValue, hashes) {
  if (!directiveValue.includes("'unsafe-inline'")) return directiveValue;
  const sources = directiveValue
    .split(" ")
    .filter((source) => source !== "'unsafe-inline'")
    .concat(hashes);
  return sources.join(" ");
}

/**
 * A hash source only satisfies a <style> element with byte-identical
 * content — the CSP spec explicitly excludes the `style="..."` attribute
 * from hash matching (that needs the separate 'unsafe-hashes' keyword, and
 * even then only for a value known ahead of time). The embedded Gig Tracker
 * sets `style` attributes with colours computed at runtime, so there is no
 * fixed value to hash. Detecting that from the rendered HTML — rather than
 * hardcoding which page it is — means any future inline style attribute
 * gets the same, correct, conservative treatment automatically (#100).
 */
function needsUnsafeInlineForStyleAttributes(html) {
  return STYLE_ATTRIBUTE.test(html);
}

/**
 * Rewrites one page's CSP meta tag in place: 'unsafe-inline' on script-src
 * is always replaced by hash sources for that page's own inline scripts.
 * style-src gets the same treatment unless the page also uses `style="..."`
 * attributes, which hashes cannot cover — those pages keep 'unsafe-inline'
 * on style-src. Pages with no CSP meta tag (there are none currently, but a
 * future one) are returned unchanged.
 */
export function injectCspHashes(html) {
  const match = CSP_META.exec(html);
  if (!match) return html;

  const { scriptHashes, styleHashes } = extractInlineHashes(html);
  const keepStyleUnsafeInline = needsUnsafeInlineForStyleAttributes(html);
  const [, prefix, content, suffix] = match;

  const newContent = content
    .split(";")
    .map((directive) => {
      const [, leading, trimmed] = directive.match(/^(\s*)(.*)$/);
      if (trimmed.startsWith("script-src ")) {
        return leading + replaceUnsafeInline(trimmed, scriptHashes);
      }
      if (trimmed.startsWith("style-src ") && !keepStyleUnsafeInline) {
        return leading + replaceUnsafeInline(trimmed, styleHashes);
      }
      return directive;
    })
    .join(";");

  return html.slice(0, match.index) + prefix + newContent + suffix + html.slice(match.index + match[0].length);
}
