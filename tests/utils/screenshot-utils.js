/**
 * Utility functions for screenshot-based visual regression testing.
 */

const fs = require('fs');
const { chromium } = require('playwright');
// pixelmatch 5 sets module.exports to the function directly; 6+ is ESM, so
// require() hands back a namespace object with the function on .default.
// Node 22 can require() either, but the shapes differ — accept both so the
// suite does not break on whichever version is installed.
const pixelmatchModule = require('pixelmatch');
const pixelmatch =
  typeof pixelmatchModule === 'function' ? pixelmatchModule : pixelmatchModule.default;
const PNG = require('pngjs').PNG;
const config = require('../config');

/**
 * Screenshots a page at a given viewport.
 */
async function takeScreenshot(pageUrl, viewport, screenshotPath) {
  let browser;
  try {
    browser = await chromium.launch(config.browserOptions);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    // Block third-party scripts. Stylesheets, fonts and images still load, so
    // the capture stays faithful to what a reader sees; what is dropped is
    // remote JavaScript that rewrites the DOM after load.
    //
    // The Flickr embed script is the reason this exists: it enhances the
    // markup client-side, so whether it had finished by screenshot time
    // varied run to run. That showed up as gig-post intermittently differing
    // by ~5,000 pixels while every other page was stable at zero. PostHog is
    // blocked for the same reason plus speed; it renders nothing.
    await page.route('**/*', (route) => {
      const request = route.request();
      const isScript = request.resourceType() === 'script';
      const isLocal = new URL(request.url()).hostname === 'localhost';
      return isScript && !isLocal ? route.abort() : route.continue();
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    // Wait for every image to finish, including remote ones such as the
    // Flickr thumbnails on gig pages. Without this the suite is flaky under
    // load: a gig post compared clean when run alone but differed by 5,197
    // pixels inside a full run, purely because the Flickr image had not
    // arrived. HTMLImageElement.complete becomes true on failure too, so a
    // genuinely dead image settles rather than hanging until the timeout.
    await page
      .waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, {
        timeout: 15000
      })
      .catch(() => {
        // Fall through to the settle delay; a stuck image should not abort
        // the run, it should show up as a visual difference.
      });

    // Wait for webfonts, so headings are not captured mid-swap.
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    // Settle any remaining late layout.
    await page.waitForTimeout(1000);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    await context.close();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

/**
 * Compares a screenshot against its baseline.
 *
 * Returns a result object rather than throwing, so the caller can produce a
 * useful assertion message. Differing image dimensions are reported as a
 * normal (failing) result; previously pixelmatch threw "Image sizes do not
 * match" as an uncaught error, which surfaced as an unreadable stack trace.
 */
function compareScreenshots(baselinePath, actualPath, diffPath) {
  const baseline = readPng(baselinePath);
  const actual = readPng(actualPath);

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return {
      match: false,
      sizeMismatch: true,
      baselineSize: `${baseline.width}x${baseline.height}`,
      actualSize: `${actual.width}x${actual.height}`,
      diffPixels: null,
      diffRatio: null
    };
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
    threshold: config.screenshots.threshold
  });

  const diffRatio = diffPixels / (width * height);

  if (diffPath && diffPixels > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return {
    match: diffRatio <= config.screenshots.maxDiffRatio,
    sizeMismatch: false,
    baselineSize: `${width}x${height}`,
    actualSize: `${width}x${height}`,
    diffPixels,
    diffRatio
  };
}

/**
 * Builds the assertion message for a failed comparison. Kept next to the
 * comparison so the two stay consistent.
 */
function describeFailure(name, result) {
  if (result.sizeMismatch) {
    return (
      `${name}: image dimensions differ — baseline ${result.baselineSize}, ` +
      `actual ${result.actualSize}. The page changed height or width. If that ` +
      `is intended, refresh baselines (see the update-baselines skill).`
    );
  }
  return (
    `${name}: ${result.diffPixels} pixels differ ` +
    `(${(result.diffRatio * 100).toFixed(4)}%), over the ` +
    `${(config.screenshots.maxDiffRatio * 100).toFixed(4)}% threshold. ` +
    `See the diff image in tests/screenshots-actual/.`
  );
}

function getScreenshotFilename(testName, viewportName) {
  return `${testName}-${viewportName}.png`;
}

function ensureScreenshotDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  takeScreenshot,
  compareScreenshots,
  describeFailure,
  getScreenshotFilename,
  ensureScreenshotDir
};
