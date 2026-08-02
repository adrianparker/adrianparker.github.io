import { expect } from "chai";
import { renderMarkdown, readableDate, isoDate, markdownLibrary } from "../../lib/filters.mjs";

describe("filters — isoDate", () => {
  it("formats as YYYY-MM-DD for sitemap lastmod", () => {
    expect(isoDate(new Date("2026-07-19T00:00:00Z"))).to.equal("2026-07-19");
  });

  it("zero-pads month and day", () => {
    expect(isoDate(new Date("2026-02-03T00:00:00Z"))).to.equal("2026-02-03");
  });

  it("drops the time, so a rebuild does not churn the sitemap", () => {
    const morning = isoDate(new Date("2026-07-19T01:30:00Z"));
    const evening = isoDate(new Date("2026-07-19T23:45:00Z"));
    expect(morning).to.equal(evening);
    expect(morning).to.not.contain("T");
  });

  it("throws on a non-Date", () => {
    expect(() => isoDate("2026-07-19")).to.throw(TypeError);
    expect(() => isoDate(undefined)).to.throw(TypeError);
  });

  it("throws on an unparseable Date", () => {
    expect(() => isoDate(new Date("nope"))).to.throw(TypeError);
  });
});

describe("filters — readableDate", () => {
  it("formats a date the way the site displays it", () => {
    expect(readableDate(new Date("2026-07-19T00:00:00Z"))).to.equal("Sunday, 19 July 2026");
  });

  it("uses en-GB day-before-month ordering, not US ordering", () => {
    // 3 February, not March 2 — this is the failure mode a locale slip produces
    expect(readableDate(new Date("2026-02-03T00:00:00Z"))).to.equal("Tuesday, 3 February 2026");
  });

  it("does not zero-pad the day", () => {
    expect(readableDate(new Date("2026-05-01T00:00:00Z"))).to.contain(" 1 May ");
  });

  it("throws on a non-Date rather than rendering 'Invalid Date' into the page", () => {
    expect(() => readableDate("2026-07-19")).to.throw(TypeError);
    expect(() => readableDate(undefined)).to.throw(TypeError);
    expect(() => readableDate(null)).to.throw(TypeError);
  });

  it("throws on an unparseable Date", () => {
    expect(() => readableDate(new Date("not a date"))).to.throw(TypeError);
  });
});

describe("filters — renderMarkdown", () => {
  it("renders markdown to HTML", () => {
    expect(renderMarkdown("*hello*").trim()).to.equal("<p><em>hello</em></p>");
  });

  it("returns empty output for empty input rather than throwing", () => {
    expect(renderMarkdown()).to.equal("");
    expect(renderMarkdown("")).to.equal("");
  });

  it("passes inline HTML through, which posts rely on", () => {
    expect(renderMarkdown('<div class="x">raw</div>')).to.contain('<div class="x">raw</div>');
  });

  it("supports footnotes", () => {
    const out = renderMarkdown("Text with a note[^1]\n\n[^1]: The note.");
    expect(out).to.contain("footnote");
  });

  it("does not leak footnote state between renders", () => {
    // Both renders share one markdown-it instance. If footnote state carried
    // over, the second render's ids would be offset from the first.
    const first = renderMarkdown("A[^1]\n\n[^1]: one.");
    const second = renderMarkdown("B[^1]\n\n[^1]: two.");
    expect(second.replace(/B|two/g, (m) => (m === "B" ? "A" : "one"))).to.equal(first);
  });

  it("exposes the same instance Eleventy uses for .md files", () => {
    expect(markdownLibrary).to.have.property("render").that.is.a("function");
  });
});
