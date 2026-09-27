import { expect } from "chai";
import {
  stripFrontMatter,
  stripNunjucks,
  stripHtml,
  stripUrls,
  extractSpellcheckText
} from "../../lib/spellcheck-targets.mjs";

describe("spellcheck-targets — stripFrontMatter", () => {
  it("removes a leading YAML front matter block, preserving line numbers", () => {
    const markdown = "---\ntitle: 'Foo'\ndate: 2026-01-01\n---\nBody text.";
    const result = stripFrontMatter(markdown);
    expect(result.split("\n")).to.have.lengthOf(5);
    expect(result.endsWith("Body text.")).to.equal(true);
    expect(result.trim()).to.equal("Body text.");
  });

  it("leaves markdown with no front matter unchanged", () => {
    expect(stripFrontMatter("Just body text.")).to.equal("Just body text.");
  });
});

describe("spellcheck-targets — stripNunjucks", () => {
  it("removes a Nunjucks tag", () => {
    expect(stripNunjucks('{% image "Foo/bar", "Alt text" %}').trim()).to.equal("");
  });

  it("removes a Nunjucks expression", () => {
    expect(stripNunjucks("Hello {{ name }}!").replace(/\s+/g, " ")).to.equal("Hello !");
  });

  it("leaves plain text unchanged", () => {
    expect(stripNunjucks("Plain text.")).to.equal("Plain text.");
  });
});

describe("spellcheck-targets — stripHtml", () => {
  it("removes an HTML tag", () => {
    expect(stripHtml('Some <a href="https://example.com">link</a> text.').replace(/\s+/g, " ")).to.equal("Some link text.");
  });

  it("removes an HTML comment", () => {
    expect(stripHtml("Before <!-- excerpt --> after.").replace(/\s+/g, " ")).to.equal("Before after.");
  });

  it("preserves a cspell directive comment", () => {
    expect(stripHtml("Text. <!-- cspell:words Tangalooma -->")).to.equal("Text. <!-- cspell:words Tangalooma -->");
  });

  it("leaves plain text unchanged", () => {
    expect(stripHtml("Plain text.")).to.equal("Plain text.");
  });

  it("preserves line numbers when a comment spans multiple lines", () => {
    const markdown = "Line one.\n<!--\nhidden\n-->\nLine two.";
    const result = stripHtml(markdown);
    expect(result.split("\n")).to.have.lengthOf(5);
    expect(result.split("\n")[4]).to.equal("Line two.");
  });
});

describe("spellcheck-targets — stripUrls", () => {
  it("removes a bare URL", () => {
    expect(stripUrls("See https://www.example.com/path for more.").replace(/\s+/g, " ")).to.equal("See for more.");
  });

  it("leaves plain text unchanged", () => {
    expect(stripUrls("Plain text.")).to.equal("Plain text.");
  });
});

describe("spellcheck-targets — extractSpellcheckText", () => {
  it("strips front matter, Nunjucks, HTML, and URLs together", () => {
    const markdown = [
      "---",
      "title: 'Foo'",
      "---",
      "## Heading",
      "",
      "Some <b>bold</b> text with a {% image \"Foo/bar\", \"Alt\" %} shortcode",
      "and a link https://example.com/path and a <!-- excerpt --> marker.",
      "<!-- cspell:words Tangalooma -->"
    ].join("\n");

    const result = extractSpellcheckText(markdown);

    expect(result).to.not.include("title: 'Foo'");
    expect(result).to.not.include("{%");
    expect(result).to.not.include("<b>");
    expect(result).to.not.include("https://");
    expect(result).to.include("## Heading");
    expect(result).to.include("Some");
    expect(result).to.include("<!-- cspell:words Tangalooma -->");
  });
});
