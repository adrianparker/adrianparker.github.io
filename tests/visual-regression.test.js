/**
 * Visual regression tests for responsive design.
 * Takes screenshots at different viewport sizes and compares against baselines.
 */

// Set base URL to HTTP server BEFORE requiring any modules that depend on config
process.env.TEST_BASE_URL = 'http://localhost:3000';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { startServer, stopServer } = require('./utils/http-server');
const {
  takeScreenshot,
  compareScreenshots,
  getScreenshotFilename,
  ensureScreenshotDir
} = require('./utils/screenshot-utils.js');
const config = require('./config');

describe('Visual Regression Tests - Responsive Design', function() {
  this.timeout(60000); // Screenshots can take time

  before(async function() {
    // Start HTTP server for proper asset loading (CSS, images, etc.)
    await startServer(3000);
    
    // Ensure directories exist
    ensureScreenshotDir(config.screenshots.baseDir);
    ensureScreenshotDir(config.screenshots.actualDir);
  });

  after(async function() {
    // Stop HTTP server after tests complete
    await stopServer();
  });

  describe('Video Post - Desktop View (1200px)', function() {
    const viewport = config.viewports.desktop;
    const testName = 'video-post';
    const pageUrl = config.baseUrl + config.testPages.videoPost;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render video post with correct layout at desktop viewport', async function() {
      // Take actual screenshot
      await takeScreenshot(pageUrl, viewport, actualPath);
      
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for desktop layout', async function() {
      // Skip if baseline doesn't exist yet (first run)
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      
      expect(result.match).to.be.true;
      expect(result.diffPixels).to.equal(0);
    });
  });

  describe('Video Post - Mobile View (768px)', function() {
    const viewport = config.viewports.mobile;
    const testName = 'video-post';
    const pageUrl = config.baseUrl + config.testPages.videoPost;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render video post with correct responsive layout at mobile viewport', async function() {
      // Take actual screenshot
      await takeScreenshot(pageUrl, viewport, actualPath);
      
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for mobile layout', async function() {
      // Skip if baseline doesn't exist yet (first run)
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      
      expect(result.match).to.be.true;
      expect(result.diffPixels).to.equal(0);
    });
  });

  describe('Home Page - Desktop View (1200px)', function() {
    const viewport = config.viewports.desktop;
    const testName = 'home-page';
    const pageUrl = config.baseUrl + config.testPages.index;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render home page correctly at desktop viewport', async function() {
      // Take actual screenshot
      await takeScreenshot(pageUrl, viewport, actualPath);
      
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for home page desktop layout', async function() {
      // Skip if baseline doesn't exist yet (first run)
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      
      expect(result.match).to.be.true;
    });
  });

  describe('Home Page - Mobile View (768px)', function() {
    const viewport = config.viewports.mobile;
    const testName = 'home-page';
    const pageUrl = config.baseUrl + config.testPages.index;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render home page correctly at mobile viewport', async function() {
      // Take actual screenshot
      await takeScreenshot(pageUrl, viewport, actualPath);
      
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for home page mobile layout', async function() {
      // Skip if baseline doesn't exist yet (first run)
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      
      expect(result.match).to.be.true;
    });
  });

  describe('Gig Post - Desktop View (1200px)', function() {
    const viewport = config.viewports.desktop;
    const testName = 'gig-post';
    const pageUrl = config.baseUrl + config.testPages.gigPost;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render gig post with correct layout at desktop viewport', async function() {
      await takeScreenshot(pageUrl, viewport, actualPath);
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for gig post desktop layout', async function() {
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      expect(result.match).to.be.true;
    });
  });

  describe('Gig Post - Mobile View (768px)', function() {
    const viewport = config.viewports.mobile;
    const testName = 'gig-post';
    const pageUrl = config.baseUrl + config.testPages.gigPost;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render gig post with correct responsive layout at mobile viewport', async function() {
      await takeScreenshot(pageUrl, viewport, actualPath);
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for gig post mobile layout', async function() {
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      expect(result.match).to.be.true;
    });
  });

  describe('Gig Index - Desktop View (1200px)', function() {
    const viewport = config.viewports.desktop;
    const testName = 'gig-index';
    const pageUrl = config.baseUrl + config.testPages.gigIndex;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render gig index with correct layout at desktop viewport', async function() {
      await takeScreenshot(pageUrl, viewport, actualPath);
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for gig index desktop layout', async function() {
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      expect(result.match).to.be.true;
    });
  });

  describe('Gig Index - Mobile View (768px)', function() {
    const viewport = config.viewports.mobile;
    const testName = 'gig-index';
    const pageUrl = config.baseUrl + config.testPages.gigIndex;
    const baselineFilename = getScreenshotFilename(testName, viewport.name);
    const baselinePath = path.join(config.screenshots.baseDir, baselineFilename);
    const actualPath = path.join(config.screenshots.actualDir, baselineFilename);

    it('should render gig index with correct responsive layout at mobile viewport', async function() {
      await takeScreenshot(pageUrl, viewport, actualPath);
      expect(fs.existsSync(actualPath)).to.be.true;
    });

    it('should match baseline screenshot for gig index mobile layout', async function() {
      if (!fs.existsSync(baselinePath)) {
        this.skip();
        return;
      }

      const diffPath = path.join(
        config.screenshots.actualDir,
        `diff-${getScreenshotFilename(testName, viewport.name)}`
      );

      const result = await compareScreenshots(baselinePath, actualPath, diffPath);
      expect(result.match).to.be.true;
    });
  });
});
