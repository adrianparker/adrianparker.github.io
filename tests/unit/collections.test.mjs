import { expect } from "chai";
import {
  mostRecentByTag,
  recentPosts,
  recentGigs,
  homePagePosts,
  SIDEBAR_ITEM_LIMIT
} from "../../lib/collections.mjs";

/** Minimal stand-in for Eleventy's collection API. */
function fakeCollectionApi(byTag) {
  return {
    getFilteredByTag(tag) {
      // Eleventy hands back an array; returning a fresh one each call mirrors
      // that, so a mutation bug shows up as a changed source array below.
      return byTag[tag] ?? [];
    }
  };
}

const item = (title, dateString, extra = {}) => ({
  data: { title },
  date: new Date(dateString),
  ...extra
});

describe("collections — mostRecentByTag", () => {
  it("returns items newest-last-input-first, i.e. reversed", () => {
    const api = fakeCollectionApi({
      post: [item("oldest", "2020-01-01"), item("middle", "2021-01-01"), item("newest", "2022-01-01")]
    });
    expect(mostRecentByTag(api, "post").map((i) => i.data.title))
      .to.deep.equal(["newest", "middle", "oldest"]);
  });

  it("caps at the sidebar limit", () => {
    const api = fakeCollectionApi({
      post: Array.from({ length: 10 }, (_, i) => item(`p${i}`, "2020-01-01"))
    });
    expect(mostRecentByTag(api, "post")).to.have.lengthOf(SIDEBAR_ITEM_LIMIT);
  });

  it("respects an explicit limit", () => {
    const api = fakeCollectionApi({
      post: Array.from({ length: 10 }, (_, i) => item(`p${i}`, "2020-01-01"))
    });
    expect(mostRecentByTag(api, "post", 5)).to.have.lengthOf(5);
  });

  it("returns fewer than the limit when there are fewer items", () => {
    const api = fakeCollectionApi({ post: [item("only", "2020-01-01")] });
    expect(mostRecentByTag(api, "post")).to.have.lengthOf(1);
  });

  it("returns an empty array for a tag with no items", () => {
    expect(mostRecentByTag(fakeCollectionApi({}), "nonexistent")).to.deep.equal([]);
  });

  it("does not mutate the collection it is given", () => {
    const source = [item("a", "2020-01-01"), item("b", "2021-01-01"), item("c", "2022-01-01")];
    const api = { getFilteredByTag: () => source };
    const before = source.map((i) => i.data.title);

    mostRecentByTag(api, "post");

    expect(source.map((i) => i.data.title)).to.deep.equal(before);
    expect(source).to.have.lengthOf(3);
  });
});

describe("collections — recentPosts / recentGigs", () => {
  it("read from their own tags and do not cross over", () => {
    const api = fakeCollectionApi({
      post: [item("a post", "2020-01-01")],
      gig: [item("a gig", "2020-01-01")]
    });
    expect(recentPosts(api).map((i) => i.data.title)).to.deep.equal(["a post"]);
    expect(recentGigs(api).map((i) => i.data.title)).to.deep.equal(["a gig"]);
  });
});

describe("collections — homePagePosts", () => {
  it("merges posts and gigs into one newest-first list", () => {
    const api = fakeCollectionApi({
      post: [item("old post", "2020-01-01"), item("new post", "2023-01-01")],
      gig: [item("mid gig", "2021-06-01")]
    });
    expect(homePagePosts(api).map((i) => i.data.title))
      .to.deep.equal(["new post", "mid gig", "old post"]);
  });

  it("is not capped — it backs the full home page and feed", () => {
    const api = fakeCollectionApi({
      post: Array.from({ length: 20 }, (_, i) => item(`p${i}`, "2020-01-01")),
      gig: Array.from({ length: 20 }, (_, i) => item(`g${i}`, "2021-01-01"))
    });
    expect(homePagePosts(api)).to.have.lengthOf(40);
  });

  it("copes with one side being empty", () => {
    const api = fakeCollectionApi({ post: [item("lonely", "2020-01-01")] });
    expect(homePagePosts(api).map((i) => i.data.title)).to.deep.equal(["lonely"]);
  });

  it("returns an empty array when there is nothing at all", () => {
    expect(homePagePosts(fakeCollectionApi({}))).to.deep.equal([]);
  });
});
