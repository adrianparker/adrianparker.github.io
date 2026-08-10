/**
 * Visual regression tests.
 *
 * Screenshots every page in config.testPages at every viewport and compares
 * against the committed baseline in tests/screenshots/.
 *
 * Data-driven on purpose: adding a page means adding one line to
 * config.testPages, not copying a 60-line describe block. The previous
 * version repeated the same block four times, which is how the two
 * video-post cases ended up asserting diffPixels === 0 while the other six
 * allowed a 5% difference.
 */

// Must be set before anything reads config. Static imports are hoisted and
// evaluated before any other top-level code in an ES module, regardless of
// where they're written, so anything reaching config.mjs is imported
// dynamically below, after this line actually runs.
process.env.TEST_BASE_URL = 'http://localhost:3000';

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { startServer, stopServer } from './utils/http-server.mjs';

const {
  takeScreenshot,
  compareScreenshots,
  describeFailure,
  getScreenshotFilename,
  ensureScreenshotDir
} = await import('./utils/screenshot-utils.mjs');
const { default: config } = await import('./config.mjs');

describe('Visual Regression Tests - Responsive Design', function () {
  this.timeout(60000);

  before(async function () {
    await startServer(3000);
    ensureScreenshotDir(config.screenshots.baseDir);
    ensureScreenshotDir(config.screenshots.actualDir);
  });

  after(async function () {
    await stopServer();
  });

  Object.entries(config.testPages).forEach(([pageName, pagePath]) => {
    config.themes.forEach((theme) => {
      // Dark covers every page; light covers a representative subset. See the
      // reasoning on `lightThemePages` in tests/config.mjs.
      if (theme === 'light' && !config.lightThemePages.includes(pageName)) return;

      Object.values(config.viewports).forEach((viewport) => {
      const label = `${pageName} @ ${viewport.name} (${viewport.width}px) ${theme}`;
      const filename = getScreenshotFilename(pageName, viewport.name, theme);
      const baselinePath = path.join(config.screenshots.baseDir, filename);
      const actualPath = path.join(config.screenshots.actualDir, filename);
      const diffPath = path.join(config.screenshots.actualDir, `diff-${filename}`);

      describe(label, function () {
        it('renders and captures a screenshot', async function () {
          await takeScreenshot(config.baseUrl + pagePath, viewport, actualPath, theme);
          expect(fs.existsSync(actualPath), `screenshot written for ${label}`).to.be.true;
        });

        it('matches its baseline', function () {
          // A missing baseline is a failure, not a skip. Previously this
          // called this.skip(), so deleting a baseline made its test green.
          expect(
            fs.existsSync(baselinePath),
            `No baseline for ${label}. Expected ${baselinePath}. If this page ` +
              `is new, generate baselines (see the update-baselines skill) and ` +
              `commit them.`
          ).to.be.true;

          const result = compareScreenshots(baselinePath, actualPath, diffPath);
          expect(result.match, describeFailure(label, result)).to.be.true;
        });
      });
      });
    });
  });
});
