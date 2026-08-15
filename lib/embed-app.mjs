/*
  Embeds a standalone HTML app into a site page at build time.

  The Gig Tracker is authored outside this repo as a self-contained
  gig-history.html + gig-history.css that opens and works on its own. Those
  two files are the source of truth and may be rewritten at any time, so the
  page is rebuilt from them on every build rather than being hand-ported once.

  That means nothing here may assume a particular class name, selector or
  element beyond the small contract documented in
  content/GigTracker/README.md. What it does assume:

    - everything the app needs lives in <body> (its <head> is discarded, since
      the site supplies title, favicon, fonts and theming)
    - the CSS uses custom properties for colour, so the palette can be
      swapped for the site's own light/dark tokens without touching layout
*/

const BODY = /<body[^>]*>([\s\S]*)<\/body>/i;

// Enough of the void list to cover anything an app shell realistically uses
// as a control. A void element has no closing tag, so it ends at its own '>'.
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "source", "track", "wbr"
]);

/*
  At-rules whose body is a list of further rules, so their contents need
  scoping too. Everything else with a block (@font-face, @keyframes) holds
  declarations or frames rather than selectors and is passed through as-is —
  prefixing "0%" or "from" with a class would corrupt it.
*/
const NESTED_AT_RULES = /^@(media|supports|container|layer|scope)\b/i;

/*
  Selectors that address the document rather than the app. The app is a
  fragment of a larger page here, so these would leak: :root would redefine
  the site's own theme tokens, and body would repaint the whole page. Both
  are replaced by the generated palette block.
*/
const DROPPED_SELECTORS = new Set([":root", "html", "body", "html, body"]);

const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

function escapeRegExp (value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The inner HTML of the app's <body>. Its <head> is deliberately dropped:
 * the app's <title> and its <link> to a sibling stylesheet are both wrong
 * once the app is one section of a site page.
 */
export function extractBodyHtml (html) {
  const match = BODY.exec(html);
  if (!match) {
    throw new Error("No <body> found in the app HTML — expected a standalone document.");
  }
  return match[1].trim();
}

/**
 * Locates one element by id and returns its start and end offsets, or null
 * if it isn't there (or its tags are unbalanced). Depth-counts matching tag
 * names so a container with same-named children still ends in the right place.
 */
function findElement (html, id) {
  const opening = new RegExp(
    `<([a-z0-9-]+)\\b[^>]*\\sid=["']${escapeRegExp(id)}["'][^>]*>`, "i"
  );
  const open = opening.exec(html);
  if (!open) { return null; }

  const tag = open[1].toLowerCase();
  const afterOpen = open.index + open[0].length;
  if (VOID_ELEMENTS.has(tag)) {
    return { start: open.index, end: afterOpen };
  }

  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  tags.lastIndex = afterOpen;
  let depth = 1;
  let next = tags.exec(html);
  while (next !== null) {
    depth += next[1] ? -1 : 1;
    if (depth === 0) {
      return { start: open.index, end: next.index + next[0].length };
    }
    next = tags.exec(html);
  }
  return null;
}

/**
 * Moves the named elements out of the layout and into a hidden container at
 * the start of the fragment.
 *
 * Deleting them outright would be tidier but breaks the app: its script does
 * `document.getElementById("reload").addEventListener(...)` at the top level,
 * so a missing element throws and takes the rest of the script — including
 * the initial render — down with it. Moving them keeps every getElementById
 * call answered while making the controls invisible and unreachable.
 *
 * The container goes first, not last, for the same reason: the app's script
 * is inline at the end of its own body and runs during parse, so anything it
 * looks up has to already have been parsed.
 */
export function quarantineElements (html, ids) {
  const removed = [];
  let remaining = html;

  for (const id of ids) {
    const found = findElement(remaining, id);
    if (!found) { continue; }
    removed.push(remaining.slice(found.start, found.end));
    remaining = remaining.slice(0, found.start) + remaining.slice(found.end);
  }

  if (removed.length === 0) { return remaining; }
  return `<div hidden class="app-embed-inert">${removed.join("")}</div>\n${remaining.trim()}`;
}

/**
 * Gives every <button> an explicit type.
 *
 * A button with no type defaults to submit. That is harmless in a standalone
 * app with no form, which is why apps rarely bother, but it fails the site's
 * HTML validation and would silently submit if the markup ever gained a form
 * around it. None of these buttons submit anything.
 */
export function defaultButtonType (html) {
  return html.replace(/<button\b(?![^>]*\stype=)([^>]*)>/gi, "<button type=\"button\"$1>");
}

/**
 * Splits a stylesheet into top-level rules, each a prelude (selector list or
 * at-rule) and the raw text of its block. Anything after the last closing
 * brace is ignored.
 */
function splitRules (css) {
  const rules = [];
  let depth = 0;
  let start = 0;
  let preludeEnd = 0;

  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      if (depth === 0) { preludeEnd = i; }
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        rules.push({
          prelude: css.slice(start, preludeEnd).trim(),
          body: css.slice(preludeEnd + 1, i)
        });
        start = i + 1;
      }
    }
  }
  return rules;
}

/**
 * Confines every selector in a stylesheet to `scope`, so the app's rules
 * cannot reach the rest of the page. Document-level selectors are dropped.
 */
export function scopeCss (css, scope) {
  return splitRules(css)
    .map((rule) => {
      if (rule.prelude.startsWith("@")) {
        return NESTED_AT_RULES.test(rule.prelude)
          ? `${rule.prelude} {\n${scopeCss(rule.body, scope)}\n}`
          : `${rule.prelude} {${rule.body}}`;
      }

      const selectors = rule.prelude
        .split(",")
        .map((selector) => selector.trim())
        .filter((selector) => selector && !DROPPED_SELECTORS.has(selector))
        // A bare universal selector should also reach the scope element
        // itself — the app expects border-box on its own outermost box.
        .map((selector) => selector === "*" ? `${scope}, ${scope} *` : `${scope} ${selector}`);

      return selectors.length === 0 ? "" : `${selectors.join(",\n")} {${rule.body}}`;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Substitutes literal colours the app hardcoded for site tokens. Only needed
 * where the app skipped its own custom properties; the contract asks it not
 * to, and anything unmapped is reported by findRawColours.
 */
export function remapColours (css, colourMap) {
  return Object.entries(colourMap).reduce(
    (out, [literal, replacement]) =>
      out.replace(new RegExp(escapeRegExp(literal), "gi"), replacement),
    css
  );
}

/**
 * Every literal colour still present. These survive theme switching
 * unchanged, so they are the page's un-themed spots — reported at build time
 * rather than thrown on, since a colour the site has never seen before is not
 * a reason to fail a deploy.
 */
export function findRawColours (css) {
  return [...new Set(css.match(RAW_COLOUR) || [])];
}

/**
 * Renders the palette that replaces the app's own :root block, mapping its
 * custom properties onto the site's theme tokens.
 */
function paletteBlock (scope, palette) {
  const declarations = Object.entries(palette)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${scope} {\n${declarations}\n}`;
}

/**
 * Turns a standalone app into an embeddable fragment plus a scoped, themed
 * stylesheet.
 */
export function buildAppEmbed ({ html, css, scope, quarantineIds = [], palette = {}, colourMap = {} }) {
  const body = defaultButtonType(quarantineElements(extractBodyHtml(html), quarantineIds));
  const scoped = remapColours(scopeCss(css, scope), colourMap);

  return {
    html: body,
    css: `${paletteBlock(scope, palette)}\n${scoped}`,
    rawColours: findRawColours(scoped)
  };
}
