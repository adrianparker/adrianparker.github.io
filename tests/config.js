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

  /**
   * Themes to capture.
   *
   * Every page is captured in dark. Light is captured only for the pages
   * listed in `lightThemePages`, deliberately rather than doubling everything:
   *
   *  - layout regressions show up identically in either theme, so a second
   *    full set would mostly duplicate the first
   *  - colour bugs that survive a theme switch (a hardcoded value, an
   *    unmaskable icon) are asserted directly in tests/theme.test.js
   *  - 16 baselines are already 11MB, and every refresh adds that again to
   *    git history
   *
   * The two chosen pages between them exercise nearly every component: entry
   * listings, the metadata card and its hairlines, external links, images and
   * the footer.
   */
  themes: ['dark', 'light'],
  lightThemePages: ['home-page', 'gig-post'],

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
