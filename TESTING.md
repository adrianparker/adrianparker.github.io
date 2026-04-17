# Testing Guide

This document explains how to run, maintain, and troubleshoot tests for the adrianparker.github.io blog.

## Overview

The project includes two types of automated tests:

1. **Smoke Tests** - Validate that the Eleventy build completes successfully and produces expected output
2. **Visual Regression Tests** - Compare screenshots of pages at different viewports (desktop and mobile) against baseline images (local development only)

**GitHub Actions CI/CD** runs only smoke tests for fast feedback. Visual regression tests are run locally during development to catch unintended design changes before they are committed.

Tests are written using **Mocha** test runner with **Chai** assertions, **Playwright** for browser automation (local visual regression only), and **Pixelmatch** for image comparison.

## Prerequisites

- Node.js 22.x or later
- ~200MB disk space for Playwright browser binaries
- macOS, Linux, or Windows

## Installation

All dependencies are automatically installed when you run:

```bash
npm install
npm run build
npx playwright install chromium
```

## Running Tests

### Run all tests (smoke + visual regression)
```bash
npm test
```

This command will:
1. Build the site using `npm run build`
2. Run all tests in the `tests/` directory
3. Report results

### Run only smoke tests
```bash
npx mocha tests/smoke.test.js --reporter spec
```

Smoke tests are fast (~4ms) and validate:
- `_site/` directory is created
- All expected HTML files are generated
- CSS includes responsive video styles
- Video shortcode is properly rendered
- No raw shortcode syntax remains in output

### Run only visual regression tests
```bash
npx mocha tests/visual-regression.test.js --reporter spec --timeout 60000
```

Visual regression tests are slower (~15s total) and:
- Start a local HTTP server on port 3000 to properly load CSS and assets
- Take screenshots at **Desktop viewport** (1200px width) and **Mobile viewport** (768px width, matching the media query breakpoint)
- Test the following pages:
  - Video post: `_site/posts/Last-Ever-Last-Ever/index.html`
  - Home page: `_site/index.html`

### Headless mode (for CI/CD)
```bash
npm run test:headless
```

This runs only smoke tests in headless mode without interactive output, suitable for GitHub Actions. GitHub Actions does not download Playwright or run visual regression tests for faster CI/CD feedback.

## Updating Baselines

When you intentionally change the design and want to update baseline screenshots:

### Option 1: Remove old baselines and regenerate
```bash
rm tests/screenshots/*.png
npm run test
cp tests/screenshots-actual/*.png tests/screenshots/
```

### Option 2: Copy new screenshots over baselines
```bash
npm run build
npx mocha tests/visual-regression.test.js --timeout 60000
cp tests/screenshots-actual/*.png tests/screenshots/
git add tests/screenshots/
git commit -m "Update baseline screenshots for design changes"
```

## Understanding Test Failures

### Smoke Test Failures

**"should produce _site directory"** - The build didn't run or failed
- Check: Run `npm run build` manually and look for errors

**"should render video shortcode in blog post HTML"** - The video shortcode isn't being processed
- Check: Verify `{% video ... %}` syntax in markdown is correct
- Check: Verify `.eleventy.js` has the video shortcode registered

**"should include video-wrapper CSS"** - Missing responsive video styles
- Check: Verify `.video-wrapper` class exists in `static/index.css`

### Visual Regression Test Failures

**"should match baseline screenshot"** - Current screenshot differs from baseline
- This indicates a layout change (intentional or unintentional)
- Check the diff image generated in `tests/screenshots-actual/diff-*.png`
- If change is intentional, update baselines (see section above)
- If unintentional, review recent CSS or HTML changes

**"timeout waiting for browser"** - Playwright browser didn't launch
- Check: `npx playwright install chromium` was run
- Check: You have ~200MB free disk space
- Try: Run tests in debug mode: `DEBUG=pw:api npx mocha ...`

## Directory Structure

```
tests/
├── config.js                  # Shared test configuration (viewports, paths, etc.)
├── smoke.test.js              # Build validation tests
├── visual-regression.test.js  # Screenshot comparison tests
├── utils/
│   ├── screenshot-utils.js    # Utilities for screenshot capture and comparison
│   └── http-server.js         # Local HTTP server for visual regression tests
├── screenshots/               # Baseline reference images (committed to git)
│   ├── home-page-desktop.png
│   ├── home-page-mobile.png
│   ├── video-post-desktop.png
│   └── video-post-mobile.png
└── screenshots-actual/        # Generated test screenshots (git ignored)
    ├── home-page-desktop.png
    ├── home-page-mobile.png
    ├── video-post-desktop.png
    └── video-post-mobile.png
```

## Configuration

Test behavior is defined in `tests/config.js`:

- **Viewport sizes**: 1200px (desktop) and 768px (mobile)
- **Base URL**: `http://localhost:3000` (visual regression tests use a local HTTP server to properly load CSS and assets)
- **HTTP Server**: Automatically started/stopped during visual regression tests on port 3000
- **Diff threshold**: 0.1 (pixel color difference, 0-255 scale)
- **Pixel threshold**: 0.05 (5% of pixels allowed to differ, accounting for minor rendering variations)

Adjust these if you need different breakpoints or stricter image matching.

## CI/CD Integration

Smoke tests run automatically on GitHub Actions when you push to `master`:

1. Node.js 22.x is set up
2. Dependencies are installed
3. Site is built with `npm run build`
4. Smoke tests run with `npm run test:headless` (~4ms, very fast)
5. If tests fail, build is marked as failed
6. If tests pass, site is deployed to GitHub Pages

**Visual regression tests are not run in CI/CD** to keep the workflow fast and lightweight. Run them locally before committing design changes.

View results in the "Actions" tab of your GitHub repository.

## Troubleshooting

### "port already in use" errors
- If running Eleventy dev server and tests simultaneously: `killall eleventy` or kill the process manually
- Port 3000 used by visual regression tests: ensure no other service is using it
- Port 8080 used by Eleventy serve: you can change it with `npx eleventy --input=content --serve --port=8081`

### Screenshots look different on CI than locally
- CI runs on Ubuntu, your machine may be macOS/Windows
- Font rendering can differ slightly between systems
- Adjust `diffPixelsThreshold` in `config.js` if needed

### Tests hang/timeout
- Check if the Eleventy build is still running in another terminal
- Check available disk space (Playwright needs ~200MB)
- Try increasing the timeout: `mocha --timeout 120000`

### Playwright browser not found
```bash
# Reinstall browser
npx playwright install chromium --with-deps

# Or clear cache and reinstall
rm -rf ~/Library/Caches/ms-playwright
npx playwright install chromium
```

## Adding New Tests

To test a new blog post or page:

1. Add a new entry to `config.testPages` in `tests/config.js`
2. Add a new test suite in `tests/visual-regression.test.js` following existing patterns
3. Run tests to generate baselines: `npx mocha tests/visual-regression.test.js --timeout 60000`
4. Copy generated screenshots to baselines: `cp tests/screenshots-actual/*.png tests/screenshots/`
5. Commit baseline images to git

## Tips for Debugging

### View test page in browser manually
```bash
npm run build
npx eleventy --input=content --serve
# Open http://localhost:8080 in browser
```

### Inspect generated HTML
```bash
cat _site/posts/Last-Ever-Last-Ever/index.html | grep -A 10 'video-wrapper'
```

### Check responsive behavior
Use browser DevTools:
1. Open Dev Tools (F12)
2. Click device toolbar icon
3. Select "Responsive" and set width to 768px
4. Verify video scales correctly

### Debug Playwright script
```bash
DEBUG=pw:api npx mocha tests/visual-regression.test.js --timeout 60000
```

## Future Enhancements

- Add visual regression for more pages (all blog posts)
- Add accessibility tests with axe-core
- Add performance tests (Lighthouse)
- Add test coverage reporting
- Generate visual regression reports with side-by-side comparisons
