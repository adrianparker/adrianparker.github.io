import { expect } from "chai";
import {
  extractBodyHtml,
  quarantineElements,
  defaultButtonType,
  scopeCss,
  remapColours,
  findRawColours,
  buildAppEmbed
} from "../../lib/embed-app.mjs";

describe("embed-app — extractBodyHtml", () => {
  it("returns the contents of the body", () => {
    expect(extractBodyHtml("<html><body><p>hi</p></body></html>")).to.equal("<p>hi</p>");
  });

  it("drops the head, so the app's title and stylesheet link do not follow it in", () => {
    const html = `<!DOCTYPE html><html><head>
      <title>Standalone</title><link rel="stylesheet" href="app.css"></head>
      <body><h1>App</h1></body></html>`;
    const body = extractBodyHtml(html);
    expect(body).to.equal("<h1>App</h1>");
    expect(body).to.not.contain("stylesheet");
  });

  it("keeps attributes on the body tag out of the result", () => {
    expect(extractBodyHtml('<body class="x" data-y="z"><p>hi</p></body>')).to.equal("<p>hi</p>");
  });

  it("handles a body spanning many lines, including scripts", () => {
    const body = extractBodyHtml("<body>\n<p>a</p>\n<script>let x = 1;</script>\n</body>");
    expect(body).to.equal("<p>a</p>\n<script>let x = 1;</script>");
  });

  it("throws when there is no body", () => {
    expect(() => extractBodyHtml("<p>just a fragment</p>")).to.throw(/No <body>/);
  });
});

describe("embed-app — quarantineElements", () => {
  it("moves the named element into a hidden container", () => {
    const out = quarantineElements('<p>a</p><button id="reload">Reload</button><p>b</p>', ["reload"]);
    expect(out).to.contain('<div hidden class="app-embed-inert"><button id="reload">Reload</button></div>');
    expect(out).to.contain("<p>a</p><p>b</p>");
  });

  it("puts the container first, so an inline script at the end still finds the element", () => {
    const out = quarantineElements('<button id="reload">Go</button><script>x</script>', ["reload"]);
    expect(out.indexOf("app-embed-inert")).to.be.lessThan(out.indexOf("<script>"));
  });

  it("moves a void element, which has no closing tag", () => {
    const out = quarantineElements('<input type="file" id="file-input" style="display:none"><p>a</p>', ["file-input"]);
    expect(out).to.contain('<div hidden class="app-embed-inert"><input type="file" id="file-input" style="display:none"></div>');
    expect(out).to.contain("<p>a</p>");
  });

  it("moves several elements at once, in the order given", () => {
    const out = quarantineElements(
      '<button id="reload">R</button><span id="status"></span><p>keep</p>',
      ["reload", "status"]
    );
    expect(out).to.contain('<button id="reload">R</button><span id="status"></span>');
    expect(out).to.contain("<p>keep</p>");
  });

  it("matches an id however it sits among other attributes, and in single quotes", () => {
    const out = quarantineElements("<button class='a' id='reload' data-x='1'>R</button>", ["reload"]);
    expect(out).to.contain("app-embed-inert");
  });

  it("ends a container at its own closing tag, not a nested one", () => {
    const out = quarantineElements('<div id="panel"><div>inner</div></div><p>after</p>', ["panel"]);
    expect(out).to.contain('<div hidden class="app-embed-inert"><div id="panel"><div>inner</div></div></div>');
    expect(out).to.contain("<p>after</p>");
  });

  it("leaves the markup untouched when no id matches", () => {
    const html = "<p>a</p>";
    expect(quarantineElements(html, ["nope"])).to.equal(html);
  });

  it("leaves the markup untouched when given no ids", () => {
    const html = '<button id="reload">R</button>';
    expect(quarantineElements(html, [])).to.equal(html);
  });

  it("leaves an element alone when its tags are unbalanced", () => {
    const html = '<p>a</p><div id="broken">never closed';
    expect(quarantineElements(html, ["broken"])).to.equal(html);
  });

  it("does not treat an id as a regular expression", () => {
    const html = '<button id="a.c">R</button><button id="abc">S</button>';
    const out = quarantineElements(html, ["a.c"]);
    expect(out).to.contain('<div hidden class="app-embed-inert"><button id="a.c">R</button></div>');
    expect(out).to.contain('<button id="abc">S</button>');
  });
});

describe("embed-app — defaultButtonType", () => {
  it("adds an explicit type to a button that has none", () => {
    expect(defaultButtonType('<button id="reset">Clear</button>'))
      .to.equal('<button type="button" id="reset">Clear</button>');
  });

  it("leaves a button that already declares its type", () => {
    const html = '<button type="submit" id="go">Go</button>';
    expect(defaultButtonType(html)).to.equal(html);
  });

  it("handles every button in the fragment", () => {
    expect(defaultButtonType("<button>a</button><button>b</button>"))
      .to.equal('<button type="button">a</button><button type="button">b</button>');
  });

  it("leaves other elements alone", () => {
    const html = '<input type="file"><span>a</span>';
    expect(defaultButtonType(html)).to.equal(html);
  });

  it("does not confuse a type attribute on a later element for this one's", () => {
    expect(defaultButtonType('<button id="a"></button><input type="file">'))
      .to.equal('<button type="button" id="a"></button><input type="file">');
  });
});

describe("embed-app — scopeCss", () => {
  it("prefixes a selector with the scope", () => {
    expect(scopeCss(".filters { gap: 10px; }", ".app")).to.equal(".app .filters { gap: 10px; }");
  });

  it("prefixes every selector in a comma-separated list", () => {
    const out = scopeCss(".a, .b { color: red; }", ".app");
    expect(out).to.contain(".app .a");
    expect(out).to.contain(".app .b");
    expect(out).to.not.contain(".app .a, .b");
  });

  it("points a universal selector at the scope element as well as its descendants", () => {
    expect(scopeCss("* { box-sizing: border-box; }", ".app"))
      .to.equal(".app, .app * { box-sizing: border-box; }");
  });

  it("drops :root, so the app cannot redefine the site's theme tokens", () => {
    expect(scopeCss(":root { --bg: #000; }\n.a { color: red; }", ".app"))
      .to.equal(".app .a { color: red; }");
  });

  it("drops body and html, so the app cannot repaint the page", () => {
    expect(scopeCss("body { background: #000; }\nhtml { margin: 0; }\n.a { color: red; }", ".app"))
      .to.equal(".app .a { color: red; }");
  });

  it("drops a combined html, body selector", () => {
    expect(scopeCss("html, body { margin: 0; }", ".app")).to.equal("");
  });

  it("keeps the sound selectors from a list that also names body", () => {
    expect(scopeCss("body, .a { color: red; }", ".app")).to.equal(".app .a { color: red; }");
  });

  it("scopes the rules inside a media query", () => {
    const out = scopeCss("@media (width >= 850px) { .a { padding: 2rem; } }", ".app");
    expect(out).to.equal("@media (width >= 850px) {\n.app .a { padding: 2rem; }\n}");
  });

  it("scopes rules inside nested conditional at-rules", () => {
    const out = scopeCss("@supports (display: grid) { @media print { .a { color: red; } } }", ".app");
    expect(out).to.contain(".app .a");
  });

  it("leaves @keyframes alone, since its blocks are frames rather than selectors", () => {
    const css = "@keyframes spin { from { opacity: 0; } to { opacity: 1; } }";
    expect(scopeCss(css, ".app")).to.equal(css.replace("spin {", "spin {"));
    expect(scopeCss(css, ".app")).to.not.contain(".app from");
  });

  it("leaves @font-face alone", () => {
    const css = "@font-face { font-family: X; src: url(x.woff2); }";
    expect(scopeCss(css, ".app")).to.equal(css);
  });

  it("returns an empty string for an empty stylesheet", () => {
    expect(scopeCss("", ".app")).to.equal("");
  });

  it("ignores a trailing fragment after the last complete rule", () => {
    expect(scopeCss(".a { color: red; }\n.b", ".app")).to.equal(".app .a { color: red; }");
  });

  it("keeps a declaration block's contents verbatim", () => {
    const out = scopeCss(".a { background: url('a{b}.png'); }", ".app");
    expect(out).to.contain("url('a{b}.png')");
  });
});

describe("embed-app — remapColours", () => {
  it("substitutes a literal for a token", () => {
    expect(remapColours("th { background: #1c2029; }", { "#1c2029": "var(--x)" }))
      .to.equal("th { background: var(--x); }");
  });

  it("substitutes every occurrence, whatever the case", () => {
    const out = remapColours("a { color: #ABC; } b { color: #abc; }", { "#abc": "var(--x)" });
    expect(out).to.equal("a { color: var(--x); } b { color: var(--x); }");
  });

  it("returns the stylesheet unchanged when the map is empty", () => {
    expect(remapColours(".a { color: red; }", {})).to.equal(".a { color: red; }");
  });
});

describe("embed-app — findRawColours", () => {
  it("finds hex literals", () => {
    expect(findRawColours(".a { color: #1c2029; border-color: #fff; }"))
      .to.deep.equal(["#1c2029", "#fff"]);
  });

  it("finds functional colour notations", () => {
    expect(findRawColours(".a { color: rgba(0,0,0,.5); background: hsl(0 0% 0%); }"))
      .to.deep.equal(["rgba(", "hsl("]);
  });

  it("reports each literal once", () => {
    expect(findRawColours(".a { color: #fff; } .b { color: #fff; }")).to.deep.equal(["#fff"]);
  });

  it("finds nothing in a stylesheet that only uses custom properties", () => {
    expect(findRawColours(".a { color: var(--color-text); }")).to.deep.equal([]);
  });
});

describe("embed-app — buildAppEmbed", () => {
  const html = `<!DOCTYPE html><html><head><title>App</title>
    <link rel="stylesheet" href="app.css"></head>
    <body><h1>App</h1><button id="reload">Reload</button>
    <script>document.getElementById("reload");</script></body></html>`;
  const css = ":root { --accent: #7c9eff; }\nbody { background: #0f1115; }\n" +
    ".tag { background: #2a2e38; color: var(--accent); }";

  const embed = buildAppEmbed({
    html,
    css,
    scope: ".gig-tracker",
    quarantineIds: ["reload"],
    palette: { "--accent": "var(--color-accent)" },
    colourMap: { "#2a2e38": "var(--color-rule)" }
  });

  it("returns the body only", () => {
    expect(embed.html).to.contain("<h1>App</h1>");
    expect(embed.html).to.not.contain("<title>");
  });

  it("quarantines the named controls", () => {
    expect(embed.html).to.contain(
      '<div hidden class="app-embed-inert"><button type="button" id="reload">Reload</button></div>'
    );
  });

  it("leads with the generated palette, mapping the app's properties to site tokens", () => {
    expect(embed.css.startsWith(".gig-tracker {\n  --accent: var(--color-accent);\n}")).to.be.true;
  });

  it("drops the app's own :root and body rules", () => {
    expect(embed.css).to.not.contain("#7c9eff");
    expect(embed.css).to.not.contain("#0f1115");
  });

  it("scopes the app's remaining rules", () => {
    expect(embed.css).to.contain(".gig-tracker .tag {");
  });

  it("remaps literal colours to tokens", () => {
    expect(embed.css).to.contain("background: var(--color-rule)");
  });

  it("reports no raw colours once everything is mapped", () => {
    expect(embed.rawColours).to.deep.equal([]);
  });

  it("reports the literals it could not map", () => {
    const unmapped = buildAppEmbed({
      html,
      css: ".tag { background: #123456; }",
      scope: ".app"
    });
    expect(unmapped.rawColours).to.deep.equal(["#123456"]);
  });

  it("defaults its optional inputs", () => {
    const bare = buildAppEmbed({ html: "<body><p>a</p></body>", css: ".a { color: red; }", scope: ".app" });
    expect(bare.html).to.equal("<p>a</p>");
    expect(bare.css).to.equal(".app {\n\n}\n.app .a { color: red; }");
  });
});
