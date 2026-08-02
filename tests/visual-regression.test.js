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

// Must be set before anything reads config.
process.env.TEST_BASE_URL = 'http://localhost:3000';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { startServer, stopServer } = require('./utils/http-server');
const {
  takeScreenshot,
  compareScreenshots,
  describeFailure,
  getScreenshotFilename,
  ensureScreenshotDir
} = require('./utils/screenshot-utils.js');
const config = require('./config');

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
    Object.values(config.viewports).forEach((viewport) => {
      const label = `${pageName} @ ${viewport.name} (${viewport.width}px)`;
      const filename = getScreenshotFilename(pageName, viewport.name);
      const baselinePath = path.join(config.screenshots.baseDir, filename);
      const actualPath = path.join(config.screenshots.actualDir, filename);
      const diffPath = path.join(config.screenshots.actualDir, `diff-${filename}`);

      describe(label, function () {
        it('renders and captures a screenshot', async function () {
          await takeScreenshot(config.baseUrl + pagePath, viewport, actualPath);
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
