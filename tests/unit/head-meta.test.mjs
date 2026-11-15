import { expect } from "chai";
import { FULL_DESCRIPTION_LENGTH, isArticle, metaDescription, firstContentImage, ogImage, duplicateHeadValues } from "../../lib/head-meta.mjs";

const SITE = "https://www.adrianparker.com";
const MEDIA = "https://d200vq1iaq5hh.cloudfront.net";

describe("head-meta — isArticle", () => {
  it("is true for posts and gigs", () => {
    expect(isArticle(["post"])).to.be.true;
    expect(isArticle(["gig"])).to.be.true;
    expect(isArticle(["post", "diving"])).to.be.true;
  });

  it("is false for apps, untagged pages and missing tags", () => {
    expect(isArticle(["app"])).to.be.false;
    expect(isArticle([])).to.be.false;
    expect(isArticle(undefined)).to.be.false;
  });
});

describe("head-meta — metaDescription", () => {
  it("leads a gig with its short summary, then the factual sentence", () => {
    expect(metaDescription({ tags: ["gig"], metadesc: "Concert review of X.", summary: "Loud and great" }))
      .to.equal("Loud and great. Concert review of X.");
    expect(metaDescription({ tags: ["gig"], metadesc: "Concert review of X.", summary: "Wow!" }))
      .to.equal("Wow! Concert review of X.");
  });

  it("uses a long gig summary on its own", () => {
    const summary = "x".repeat(FULL_DESCRIPTION_LENGTH);
    expect(metaDescription({ tags: ["gig"], metadesc: "Concert review of X.", summary })).to.equal(summary);
  });

  it("uses a gig summary alone when there is no metadesc", () => {
    expect(metaDescription({ tags: ["gig"], summary: "Loud" })).to.equal("Loud");
  });

  it("falls back to metadesc on a gig with no summary", () => {
    expect(metaDescription({ tags: ["gig"], metadesc: "Concert review of X" })).to.equal("Concert review of X");
  });

  it("prefers metadesc everywhere else, falling back to summary", () => {
    expect(metaDescription({ tags: ["post"], metadesc: "M", summary: "S" })).to.equal("M");
    expect(metaDescription({ tags: ["post"], summary: "S" })).to.equal("S");
    expect(metaDescription({ metadesc: "M" })).to.equal("M");
  });

  it("strips markup and collapses whitespace", () => {
    expect(metaDescription({ tags: ["gig"], summary: "Seattle <em>grunge</em>\n  dads" })).to.equal("Seattle grunge dads");
  });

  it("returns an empty string when there is nothing to say", () => {
    expect(metaDescription({})).to.equal("");
  });
});

describe("head-meta — firstContentImage", () => {
  it("returns the first media-bucket image with its alt", () => {
    const html = `<p>x</p><img src="${MEDIA}/a-800.jpeg" alt="The band"><img src="${MEDIA}/b.jpeg" alt="b">`;
    expect(firstContentImage(html, MEDIA)).to.deep.equal({ src: `${MEDIA}/a-800.jpeg`, alt: "The band" });
  });

  it("accepts root-relative images and treats a missing alt as empty", () => {
    expect(firstContentImage('<img src="/img/x.jpeg">', MEDIA)).to.deep.equal({ src: "/img/x.jpeg", alt: "" });
  });

  it("skips third-party, protocol-relative, placeholder and src-less images", () => {
    const html = '<img alt="none"><img src="https://www.setlist.fm/widgets/x"><img src="//cdn.example/x.png"><img src="/blank.gif">';
    expect(firstContentImage(html, MEDIA)).to.equal(null);
  });

  it("returns null for empty or missing content", () => {
    expect(firstContentImage("", MEDIA)).to.equal(null);
    expect(firstContentImage(undefined, MEDIA)).to.equal(null);
  });
});

describe("head-meta — ogImage", () => {
  const base = { siteUrl: SITE, mediaUrl: MEDIA, defaultImage: "/img/Adrian.jpeg", defaultAlt: "Adrian Parker", title: "T" };

  it("uses front matter image first, made absolute", () => {
    expect(ogImage({ ...base, image: "/img/hero.jpeg", imageAlt: "Hero" })).to.deep.equal({ url: `${SITE}/img/hero.jpeg`, alt: "Hero", large: true });
  });

  it("falls back to the title, then the default alt, for a front matter image", () => {
    expect(ogImage({ ...base, image: `${MEDIA}/h.jpeg` }).alt).to.equal("T");
    expect(ogImage({ ...base, title: undefined, image: `${MEDIA}/h.jpeg` }).alt).to.equal("Adrian Parker");
  });

  it("uses the first content image next", () => {
    const content = `<img src="${MEDIA}/a.jpeg" alt="A">`;
    expect(ogImage({ ...base, content })).to.deep.equal({ url: `${MEDIA}/a.jpeg`, alt: "A", large: true });
  });

  it("gives a content image without alt the page title, or the default alt", () => {
    const content = `<img src="${MEDIA}/a.jpeg">`;
    expect(ogImage({ ...base, content }).alt).to.equal("T");
    expect(ogImage({ ...base, title: undefined, content }).alt).to.equal("Adrian Parker");
  });

  it("falls back to the default portrait, flagged as not large", () => {
    expect(ogImage({ ...base, content: "<p>no images</p>" })).to.deep.equal({ url: `${SITE}/img/Adrian.jpeg`, alt: "Adrian Parker", large: false });
  });
});

describe("head-meta — duplicateHeadValues", () => {
  const page = (url, title, desc) => ({ url, content: `<title>${title}</title><meta name="description" content="${desc}">` });

  it("reports titles and descriptions shared by more than one page", () => {
    const result = duplicateHeadValues([page("/a/", "Same", "One"), page("/b/", "Same", "Two"), page("/c/", "Other", "Two")]);
    expect(result.titles).to.deep.equal([{ value: "Same", urls: ["/a/", "/b/"] }]);
    expect(result.descriptions).to.deep.equal([{ value: "Two", urls: ["/b/", "/c/"] }]);
  });

  it("ignores redirect stubs, non-HTML output and empty values", () => {
    const stub = { url: "/old/", content: '<meta http-equiv="refresh" content="0"><title>Redirecting…</title>' };
    const result = duplicateHeadValues([
      stub, { ...stub, url: "/old2/" }, { url: "/feed.xml", content: undefined }, page("/a/", "", ""), page("/b/", "", "")
    ]);
    expect(result).to.deep.equal({ titles: [], descriptions: [] });
  });
});
