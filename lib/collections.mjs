/** How many recent items the sidebar shows per section. */
export const SIDEBAR_ITEM_LIMIT = 3;

/**
 * Newest-first items carrying `tag`, capped at `limit`.
 *
 * Note this does not mutate the collection it is given. The original
 * implementation called .reverse() directly on the array returned by
 * getFilteredByTag and then assigned to .length to truncate, both of which
 * mutate in place.
 */
export function mostRecentByTag(collectionApi, tag, limit = SIDEBAR_ITEM_LIMIT) {
  return collectionApi
    .getFilteredByTag(tag)
    .slice()
    .reverse()
    .slice(0, limit);
}

/** Up to 3 most recent posts, for the sidebar. */
export function recentPosts(collectionApi) {
  return mostRecentByTag(collectionApi, "post");
}

/** Up to 3 most recent gigs, for the sidebar. */
export function recentGigs(collectionApi) {
  return mostRecentByTag(collectionApi, "gig");
}

/**
 * Posts and gigs merged into one newest-first list, for the home page and
 * the RSS feed. Gigs are a separate tag, so neither collection alone is
 * the full chronological record.
 */
export function homePagePosts(collectionApi) {
  const posts = collectionApi.getFilteredByTag("post");
  const gigs = collectionApi.getFilteredByTag("gig");
  return posts.concat(gigs).sort((a, b) => b.date - a.date);
}
