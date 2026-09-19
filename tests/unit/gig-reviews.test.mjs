import { expect } from "chai";
import { parseGigReviews, findReviewUrl } from "../../lib/gig-reviews.mjs";

function post (name, frontMatter) {
  return { name, content: `---\n${frontMatter}\n---\nBody.\n` };
}

describe("gig-reviews — parseGigReviews", () => {
  it("extracts a date/url pair per review post, keyed by the post's own filename", () => {
    const reviews = parseGigReviews([
      post("20070730-Scorpions-Hammersmith-Apollo-London.md", "date: 2007-07-30")
    ]);
    expect(reviews).to.deep.equal([
      { date: "2007-07-30", url: "/posts/gigs/20070730-Scorpions-Hammersmith-Apollo-London/" }
    ]);
  });

  it("skips a post with no date front matter", () => {
    const reviews = parseGigReviews([post("no-date.md", "title: 'Untitled'")]);
    expect(reviews).to.deep.equal([]);
  });

  it("handles more than one review post", () => {
    const reviews = parseGigReviews([
      post("a.md", "date: 2007-07-30"),
      post("b.md", "date: 2026-09-11")
    ]);
    expect(reviews.map((r) => r.date)).to.deep.equal(["2007-07-30", "2026-09-11"]);
  });
});

describe("gig-reviews — findReviewUrl", () => {
  const reviews = parseGigReviews([
    post("20070730-Scorpions-Hammersmith-Apollo-London.md", "date: 2007-07-30")
  ]);

  it("returns the review URL for a matching date", () => {
    expect(findReviewUrl(reviews, "2007-07-30"))
      .to.equal("/posts/gigs/20070730-Scorpions-Hammersmith-Apollo-London/");
  });

  it("matches every gig-history row sharing that date, not just one", () => {
    const url = findReviewUrl(reviews, "2007-07-30");
    expect(findReviewUrl(reviews, "2007-07-30")).to.equal(url);
  });

  it("returns null when no review post matches the date", () => {
    expect(findReviewUrl(reviews, "1999-01-01")).to.equal(null);
  });
});
