/**
 * Behavioural tests for the Gig Tracker statistics map view (#139): it only
 * appears once a Country or City filter is active, and shows one marker per
 * resolved location with the gig count on it.
 *
 * OpenStreetMap tile requests are intercepted rather than hitting the real
 * network — the first thing in this suite to make an external HTTP call, so
 * this keeps the test deterministic and runnable offline.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme 3001, analytics 3002, gig-tracker 3003, app-nav/filter
// adaptation 3004, gig-tracker stats chart 3005, stats toggle 3006.
const PORT = 3007;
const BASE = `http://localhost:${PORT}`;

// A 1x1 transparent PNG, standing in for every tile image.
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

describe('Gig Tracker statistics map view', function () {
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

  async function openPage() {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    await page.route('https://*.tile.openstreetmap.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE }));
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
    await page.click('#stats-toggle');
    await page.waitForSelector('#stats-panel.stats-panel--open');
    return { context, page };
  }

  it('stays hidden with no country or city filter active', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-performer', { index: 1 });
    await page.waitForTimeout(100);
    const hidden = await page.getAttribute('#stats-map-wrap', 'hidden');
    expect(hidden).to.not.equal(null);
    await context.close();
  });

  it('shows a marker per venue when filtered by city', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const markerCounts = await page.$$eval('.gig-map-marker', (els) => els.map((el) => Number(el.textContent)));
    expect(markerCounts.length).to.be.greaterThan(0);
    const total = markerCounts.reduce((sum, n) => sum + n, 0);

    const rowCount = await page.evaluate(() => {
      const match = document.getElementById('rowcount').textContent.match(/Showing (\d+)/);
      return Number(match[1]);
    });
    // Every Wellington gig has a resolvable location, so marker counts should
    // sum to the full filtered row count.
    expect(total).to.equal(rowCount);
    await context.close();
  });

  it('falls back to city-level pins when filtered by country only', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-country', 'United Kingdom');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const markerCounts = await page.$$eval('.gig-map-marker', (els) => els.map((el) => Number(el.textContent)));
    expect(markerCounts.length).to.be.greaterThan(1); // several UK cities in the data
    await context.close();
  });

  it('hides again when filters are cleared', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.click('#reset');
    // The element still exists (Playwright's default "visible" wait state
    // wouldn't match it once display:none via [hidden] takes effect).
    await page.waitForSelector('#stats-map-wrap[hidden]', { state: 'attached' });
    await context.close();
  });
});
