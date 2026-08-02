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
      // NOTE: 768 is exactly the breakpoint collision described in #18 —
      // Pure.css's -md- grid tier is min-width 48em (768px) while the site's
      // own query is max-width 768px, so both apply and the page renders in
      // a state neither is designed for. The mobile baselines therefore
      // capture that broken layout. Left as-is deliberately: #18 owns both
      // the CSS fix and moving this viewport below the breakpoint.
      name: 'mobile',
      width: 768,
      height: 1024
    }
  },

  /**
   * Pages under visual regression. Add an entry here and the suite picks it
   * up for every viewport automatically.
   */
  testPages: {
    'home-page': '/index.html',
    'posts-index': '/posts/index.html',
    'video-post': '/posts/Last-Ever-Last-Ever/index.html',
    'gig-post': '/posts/gigs/20090218-Datsuns-Astoria-London/index.html',
    'gig-index': '/gigs/index.html',
    'exif-app': '/ExifCmdLine/index.html'
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
