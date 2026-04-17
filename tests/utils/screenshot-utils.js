/**
 * Utility functions for screenshot-based visual regression testing.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;
const config = require('../config');

/**
 * Takes a screenshot of a page at a specific viewport size.
 * @param {string} pageUrl - The URL of the page to screenshot
 * @param {Object} viewport - Viewport configuration {width, height}
 * @param {string} screenshotPath - Where to save the screenshot
 */
async function takeScreenshot(pageUrl, viewport, screenshotPath) {
  let browser;
  try {
    browser = await chromium.launch(config.browserOptions);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    // Wait for any lazy-loaded content
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await context.close();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Compares two screenshot images and returns the result.
 * @param {string} baselinePath - Path to baseline (reference) image
 * @param {string} actualPath - Path to actual (test) image
 * @param {string} diffPath - Where to save the diff image (optional)
 * @returns {Object} Comparison result {match: boolean, diffPixels: number, diffPercentage: number}
 */
async function compareScreenshots(baselinePath, actualPath, diffPath) {
  return new Promise((resolve, reject) => {
    // Create read streams
    const baselineStream = fs.createReadStream(baselinePath);
    const actualStream = fs.createReadStream(actualPath);
    
    let baseline, actual;
    let baselineLoaded = false;
    let actualLoaded = false;

    baselineStream
      .pipe(new PNG())
      .on('parsed', function() {
        baseline = this;
        baselineLoaded = true;
        if (actualLoaded) {
          performComparison();
        }
      })
      .on('error', reject);

    actualStream
      .pipe(new PNG())
      .on('parsed', function() {
        actual = this;
        actualLoaded = true;
        if (baselineLoaded) {
          performComparison();
        }
      })
      .on('error', reject);

    function performComparison() {
      const { width, height } = baseline;
      const diff = new PNG({ width, height });
      
      const diffPixels = pixelmatch(
        baseline.data,
        actual.data,
        diff.data,
        width,
        height,
        { threshold: config.screenshots.threshold }
      );

      const diffPercentage = diffPixels / (width * height);
      const match = diffPercentage < config.screenshots.diffPixelsThreshold;

      // Optionally save diff image
      if (diffPath) {
        diff.pack().pipe(fs.createWriteStream(diffPath));
      }

      resolve({
        match,
        diffPixels,
        diffPercentage: (diffPercentage * 100).toFixed(2)
      });
    }
  });
}

/**
 * Gets the screenshot filename for a test page and viewport.
 * @param {string} testName - Name of the test page (e.g., 'video-post')
 * @param {string} viewportName - Name of the viewport (e.g., 'desktop', 'mobile')
 * @returns {string} Filename for the screenshot
 */
function getScreenshotFilename(testName, viewportName) {
  return `${testName}-${viewportName}.png`;
}

/**
 * Ensures the screenshot directory exists.
 * @param {string} dirPath - Path to the directory
 */
function ensureScreenshotDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  takeScreenshot,
  compareScreenshots,
  getScreenshotFilename,
  ensureScreenshotDir
};
