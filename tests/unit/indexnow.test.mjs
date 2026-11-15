import { expect } from "chai";
import { parseSitemap, builtFilePath, findChangedUrls, buildPayload, INDEXNOW_ENDPOINT } from "../../lib/indexnow.mjs";

const SITE = "https://www.adrianparker.com";

describe("indexnow — parseSitemap", () => {
  it("returns every <loc> in order", () => {
    const xml = `<urlset>
      <url><loc>${SITE}/</loc><lastmod>2026-01-01</lastmod></url>
      <url><loc> ${SITE}/posts/A/ </loc></url>
    </urlset>`;
    expect(parseSitemap(xml)).to.deep.equal([`${SITE}/`, `${SITE}/posts/A/`]);
  });

  it("returns an empty list for a sitemap with no URLs", () => {
    expect(parseSitemap("<urlset></urlset>")).to.deep.equal([]);
  });
});

describe("indexnow — builtFilePath", () => {
  it("maps the home page to index.html", () => {
    expect(builtFilePath(`${SITE}/`, SITE)).to.equal("index.html");
    expect(builtFilePath(SITE, SITE)).to.equal("index.html");
  });

  it("maps a directory URL to its index.html", () => {
    expect(builtFilePath(`${SITE}/posts/gigs/X/`, SITE)).to.equal("posts/gigs/X/index.html");
  });

  it("maps a file URL to itself", () => {
    expect(builtFilePath(`${SITE}/feed.xml`, SITE)).to.equal("feed.xml");
  });

  it("throws for a URL on another host", () => {
    expect(() => builtFilePath("https://example.com/", SITE)).to.throw(/not on/);
  });
});

describe("indexnow — findChangedUrls", () => {
  const built = { a: "same", b: "new copy", c: "brand new", d: "unknown" };
  const live = { a: "same", b: "old copy", c: null };
  const readBuilt = (url) => built[url];
  const fetchLive = async (url) => {
    if (!(url in live)) throw new Error("network");
    return live[url];
  };

  it("keeps changed and new pages, drops unchanged and unreachable ones", async () => {
    const changed = await findChangedUrls(["a", "b", "c", "d"], { readBuilt, fetchLive });
    expect(changed).to.deep.equal(["b", "c"]);
  });

  it("returns an empty list when nothing changed", async () => {
    expect(await findChangedUrls(["a"], { readBuilt, fetchLive })).to.deep.equal([]);
  });
});

describe("indexnow — buildPayload", () => {
  it("builds the IndexNow body with the key file location", () => {
    expect(buildPayload({ siteUrl: SITE, key: "abc", urls: [`${SITE}/`] })).to.deep.equal({
      host: "www.adrianparker.com",
      key: "abc",
      keyLocation: `${SITE}/abc.txt`,
      urlList: [`${SITE}/`]
    });
  });

  it("returns null when there are no URLs", () => {
    expect(buildPayload({ siteUrl: SITE, key: "abc", urls: [] })).to.equal(null);
  });

  it("points at the shared IndexNow endpoint", () => {
    expect(INDEXNOW_ENDPOINT).to.equal("https://api.indexnow.org/indexnow");
  });
});
