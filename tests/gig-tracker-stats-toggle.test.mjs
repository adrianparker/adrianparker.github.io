/**
 * Behavioural test for the Gig Tracker statistics toggle button's active
 * state (#126). Closing the panel already removes .is-active, but a touch
 * tap (unlike a mouse click) can leave the button matching :focus-visible
 * afterwards, so the shared focus/active outline stayed showing on mobile.
 * The fix blurs the button on close, mirroring how the filter <select>s
 * already behave (see gig-tracker.test.mjs).
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme 3001, analytics 3002, gig-tracker 3003, app-nav/filter
// adaptation 3004, gig-tracker stats chart 3005.
const PORT = 3006;
const BASE = `http://localhost:${PORT}`;

describe('Gig Tracker statistics toggle active state', function () {
  this.timeout(60000);

  let browser;

  before(async function () {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  });

  after(async function () {
    if (browser) await browser.close();
    await stopServer();
  });

  it('loses focus and .is-active when closed by a touch tap', async function () {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });

    await page.tap('#stats-toggle');
    await page.waitForSelector('#stats-panel.stats-panel--open');
    expect(await page.evaluate(() => document.getElementById('stats-toggle').classList.contains('is-active')))
      .to.equal(true);

    await page.tap('#stats-toggle');
    await page.waitForSelector('#stats-panel', { state: 'hidden' });

    const state = await page.evaluate(() => ({
      isActive: document.getElementById('stats-toggle').classList.contains('is-active'),
      isFocused: document.activeElement === document.getElementById('stats-toggle')
    }));
    expect(state.isActive, 'is-active removed after closing').to.equal(false);
    expect(state.isFocused, 'button blurred after closing').to.equal(false);

    await context.close();
  });

  it('does not leave a stuck accent border from sticky mobile :hover (#132)', async function () {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });

    // This emulated touch context has no hover-capable pointer, matching the
    // real mobile browsers where a tap leaves the tapped element matching
    // :hover indefinitely.
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).to.equal(false);

    const borderColor = () => page.evaluate(() =>
      getComputedStyle(document.getElementById('stats-toggle')).borderColor);
    const defaultBorderColor = await borderColor();

    await page.tap('#stats-toggle');
    await page.waitForSelector('#stats-panel.stats-panel--open');
    await page.tap('#stats-toggle');
    await page.waitForSelector('#stats-panel', { state: 'hidden' });

    expect(await borderColor(), 'border reverts to default, no lingering hover tint')
      .to.equal(defaultBorderColor);

    await context.close();
  });
});
