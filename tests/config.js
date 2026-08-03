/**
 * Shared configuration for the visual regression and smoke tests.
 */

// Visual regression serves over HTTP so assets resolve; other contexts read
// straight off disk.
const baseUrl = process.env.TEST_BASE_URL || `file://${process.cwd()}/_site`;

module.exports = {
  baseUrl,

  viewports: {
    desktop: {
      name: 'desktop',
      width: 1200,
      height: 800
    },
    mobile: {
      // Was 768, which is exactly where Pure.css's -md- grid tier
      // (min-width: 48em) collided with the site's own max-width query — the
      // baselines captured a layout neither was designed for. #18 moved the
      // site query to 47.999em; this now sits at a realistic phone width,
      // comfortably inside the mobile layout rather than on its boundary.
      name: 'mobile',
      width: 390,
      height: 844
    }
  },

  /**
   * Pages under visual regression. Add an entry here and the suite picks it
   * up for every viewport automatically.
   */
  testPages: {
    'home-page': '/index.html',
    'apps-index': '/apps/index.html',
    'posts-index': '/posts/index.html',
    'video-post': '/posts/Last-Ever-Last-Ever/index.html',
    'gig-post': '/posts/gigs/20090218-Datsuns-Astoria-London/index.html',
    'gig-index': '/gigs/index.html',
    'exif-app': '/ExifCmdLine/index.html',
    'not-found': '/404.html'
  },

  screenshots: {
    baseDir: `${process.cwd()}/tests/screenshots`,
    actualDir: `${process.cwd()}/tests/screenshots-actual`,

    // Per-pixel colour tolerance passed to pixelmatch (0-1).
    threshold: 0.1,

    /**
     * Maximum share of pixels allowed to differ before a page is considered
     * changed (0-1).
     *
     * This was 5% for most pages while two video-post assertions demanded
     * exactly 0, which is both inconsistent and, at 5%, loose enough that an
     * entire sidebar column could change without failing. 0.1% absorbs
     * antialiasing jitter and nothing else.
     */
    maxDiffRatio: 0.001
  },

  browserOptions: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
};
