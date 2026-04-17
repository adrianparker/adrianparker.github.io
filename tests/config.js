/**
 * Test configuration for visual regression and smoke tests.
 * Defines viewport sizes and base URLs for testing.
 */

// For visual regression tests, use localhost; for other contexts, use file://
const baseUrl = process.env.TEST_BASE_URL || `file://${process.cwd()}/_site`;

module.exports = {
  // Base URL for local testing - uses HTTP server for proper asset loading
  baseUrl: baseUrl,

  // Viewport sizes to test
  viewports: {
    desktop: {
      name: 'desktop',
      width: 1200,
      height: 800
    },
    mobile: {
      name: 'mobile',
      width: 768,
      height: 1024
    }
  },

  // Paths to test pages
  testPages: {
    videoPost: '/posts/Last-Ever-Last-Ever/index.html',
    index: '/index.html'
  },

  // Screenshot configuration
  screenshots: {
    baseDir: `${process.cwd()}/tests/screenshots`,
    actualDir: `${process.cwd()}/tests/screenshots-actual`,
    // Allowed pixel difference threshold for image comparison (0-255)
    threshold: 0.1,
    // Percentage of pixels allowed to differ (0-1) - 5% to account for minor rendering variations
    diffPixelsThreshold: 0.05
  },

  // Playwright browser options
  browserOptions: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
};
