import { expect } from "chai";
import { createHash } from "node:crypto";
import { extractInlineHashes, injectCspHashes } from "../../lib/csp-hash.mjs";

function sriHash(content) {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

const CSP_HTML = (directives) =>
  `<head><meta http-equiv="Content-Security-Policy" content="${directives}"></head>`;

describe("csp-hash — extractInlineHashes", () => {
  it("hashes an inline script's exact content", () => {
    const { scriptHashes } = extractInlineHashes("<script>var x = 1;</script>");
    expect(scriptHashes).to.deep.equal([sriHash("var x = 1;")]);
  });

  it("hashes an inline style's exact content", () => {
    const { styleHashes } = extractInlineHashes("<style>.a{color:red}</style>");
    expect(styleHashes).to.deep.equal([sriHash(".a{color:red}")]);
  });

  it("ignores a script with a src attribute", () => {
    const { scriptHashes } = extractInlineHashes('<script src="/app.js"></script>');
    expect(scriptHashes).to.deep.equal([]);
  });

  it("ignores an empty inline script", () => {
    const { scriptHashes } = extractInlineHashes("<script></script>");
    expect(scriptHashes).to.deep.equal([]);
  });

  it("ignores an empty inline style", () => {
    const { styleHashes } = extractInlineHashes("<style></style>");
    expect(styleHashes).to.deep.equal([]);
  });

  it("dedupes repeated identical blocks", () => {
    const { scriptHashes } = extractInlineHashes("<script>x()</script><script>x()</script>");
    expect(scriptHashes).to.have.lengthOf(1);
  });

  it("hashes scripts and styles with attributes on the tag", () => {
    const { scriptHashes, styleHashes } = extractInlineHashes(
      '<script type="text/javascript">a()</script><style media="screen">.b{}</style>'
    );
    expect(scriptHashes).to.deep.equal([sriHash("a()")]);
    expect(styleHashes).to.deep.equal([sriHash(".b{}")]);
  });

  it("collects several distinct blocks", () => {
    const { scriptHashes } = extractInlineHashes("<script>a()</script><script>b()</script>");
    expect(scriptHashes).to.have.lengthOf(2);
  });
});

describe("csp-hash — injectCspHashes", () => {
  it("replaces 'unsafe-inline' on script-src with the page's script hashes", () => {
    const html =
      CSP_HTML("script-src 'self' 'unsafe-inline'") + "<script>var x = 1;</script>";
    const out = injectCspHashes(html);
    expect(out).to.contain(`script-src 'self' ${sriHash("var x = 1;")}`);
    expect(out).to.not.contain("'unsafe-inline'");
  });

  it("replaces 'unsafe-inline' on style-src with the page's style hashes", () => {
    const html = CSP_HTML("style-src 'self' 'unsafe-inline'") + "<style>.a{}</style>";
    const out = injectCspHashes(html);
    expect(out).to.contain(`style-src 'self' ${sriHash(".a{}")}`);
    expect(out).to.not.contain("'unsafe-inline'");
  });

  it("leaves other directives untouched", () => {
    const html = CSP_HTML("default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self'");
    const out = injectCspHashes(html);
    expect(out).to.contain("default-src 'self'");
    expect(out).to.contain("img-src 'self'");
  });

  it("only hashes that page's own inline blocks, not another page's", () => {
    const pageA = CSP_HTML("script-src 'self' 'unsafe-inline'") + "<script>a()</script>";
    const pageB = CSP_HTML("script-src 'self' 'unsafe-inline'") + "<script>b()</script>";
    expect(injectCspHashes(pageA)).to.contain(sriHash("a()"));
    expect(injectCspHashes(pageA)).to.not.contain(sriHash("b()"));
    expect(injectCspHashes(pageB)).to.contain(sriHash("b()"));
  });

  it("leaves a directive with no 'unsafe-inline' unchanged", () => {
    const html = CSP_HTML("script-src 'self' https://example.com");
    const out = injectCspHashes(html);
    expect(out).to.contain("script-src 'self' https://example.com");
  });

  it("returns html unchanged when there is no CSP meta tag", () => {
    const html = "<head><title>No CSP</title></head><script>x()</script>";
    expect(injectCspHashes(html)).to.equal(html);
  });

  it("keeps 'unsafe-inline' on style-src when the page has a style attribute, since hashes cannot cover attribute values", () => {
    const html =
      CSP_HTML("script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'") +
      '<div style="display:none"></div>';
    const out = injectCspHashes(html);
    expect(out).to.contain("style-src 'self' 'unsafe-inline'");
    expect(out).to.not.contain("script-src 'self' 'unsafe-inline'");
  });

  it("drops 'unsafe-inline' from style-src when the only inline styling is a <style> block", () => {
    const html = CSP_HTML("style-src 'self' 'unsafe-inline'") + "<style>.a{}</style>";
    const out = injectCspHashes(html);
    expect(out).to.not.contain("'unsafe-inline'");
  });

  it("preserves the semicolon-separated directive formatting", () => {
    const html = CSP_HTML("default-src 'self'; script-src 'self' 'unsafe-inline'") + "<script>x()</script>";
    const out = injectCspHashes(html);
    const content = /content="([^"]*)"/.exec(out)[1];
    expect(content.split(";").map((d) => d.trim())).to.deep.equal([
      "default-src 'self'",
      `script-src 'self' ${sriHash("x()")}`
    ]);
  });
});
