/*
  Matches content/GigTracker/gig-history.md rows to their review post, if one
  exists. A review post (content/posts/gigs/<slug>.md) covers a whole show,
  not a single performer, so the join key is the gig's date — every
  gig-history row sharing a review post's `date` front matter links to it.
*/
import matter from "gray-matter";

/**
 * Extracts one { date, url } pair per gig review post. `files` is an array
 * of { name, content } — the post's filename (used as the URL slug) and raw
 * markdown, including front matter. Posts with no `date` front matter are
 * skipped rather than failing the build, since that front matter field is
 * validated elsewhere (the post layout itself).
 */
export function parseGigReviews (files) {
  return files
    .map((file) => {
      const { data } = matter(file.content);
      if (!data.date) { return null; }
      const slug = file.name.replace(/\.md$/, "");
      return { date: data.date.toISOString().slice(0, 10), url: `/posts/gigs/${slug}/` };
    })
    .filter(Boolean);
}

/** The review URL for a gig-history date, or null if no review post matches. */
export function findReviewUrl (reviews, date) {
  const review = reviews.find((r) => r.date === date);
  return review ? review.url : null;
}
