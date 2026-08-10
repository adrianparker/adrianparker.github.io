/**
 * Utility functions for screenshot-based visual regression testing.
 */

import fs from 'fs';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import config from '../config.mjs';

/**
 * Screenshots a page at a given viewport.
 */
export async function takeScreenshot(pageUrl, viewport, screenshotPath, colorScheme = 'dark') {
  let browser;
  try {
    browser = await chromium.launch(config.browserOptions);
    const context = await browser.newContext({ viewport, colorScheme });
    const page = await context.newPage();

    // Block third-party scripts and media. Stylesheets, fonts and images still
    // load, so the capture stays faithful to what a reader sees.
    //
    // Scripts: the Flickr embed enhances gig markup client-side, and whether
    // it had finished by screenshot time varied run to run — gig-post
    // intermittently differed by ~5,000 pixels while every other page sat at
    // zero. PostHog is blocked for the same reason plus speed; it renders
    // nothing.
    //
    // Media: the video post embeds a remote MP4 with preload="metadata".
    // Chromium sometimes painted its first frame and sometimes an empty box,
    // giving a bimodal 336,420-pixel (2.55%) difference that appeared in
    // roughly half of runs. Neither images nor scripts, so the existing waits
    // did not cover it. Blocking costs nothing in layout terms: .video-wrapper
    // has a fixed 16/9 aspect-ratio box, so the element occupies identical
    // space either way and only the pixels inside it change.
    const BLOCKED_TYPES = new Set(['script', 'media']);
    await page.route('**/*', (route) => {
      const request = route.request();
      const isLocal = new URL(request.url()).hostname === 'localhost';
      return BLOCKED_TYPES.has(request.resourceType()) && !isLocal
        ? route.abort()
        : route.continue();
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    // Force lazy images to load. The image shortcode emits loading="lazy",
    // and these are fullPage captures, so whether a below-the-fold image had
    // decoded by capture time was pure timing. That produced a bimodal
    // 336,420-pixel difference on the video post in roughly half of runs —
    // the diff falling in a single 600px band matching one generated 800x600
    // photo, which is what identified it.
    // Setting loading="eager" on an already-parsed lazy image starts its
    // fetch immediately in Chromium.
    await page.evaluate(() => {
      for (const img of document.images) img.loading = 'eager';
    });

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

    // complete only means the bytes arrived. decode() resolves once the frame
    // is actually rasterised and paintable, which is what the screenshot needs.
    await page
      .evaluate(() =>
        Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})))
      )
      .catch(() => {});

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
export function compareScreenshots(baselinePath, actualPath, diffPath) {
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
export function describeFailure(name, result) {
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

export function getScreenshotFilename(testName, viewportName, theme = 'dark') {
  return `${testName}-${viewportName}-${theme}.png`;
}

export function ensureScreenshotDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
