/**
 * Behavioural tests for the Gig Tracker statistics map view (#139): it is
 * always visible (#149) and shows one marker per resolved location with the
 * gig count on it, at one of three zoom levels — country (#195), city (#148)
 * or venue (#192) — depending on which filters are active. All three levels
 * share one marker style, and clicking a marker at any level sets the
 * corresponding filter (#192).
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

  // Markers cluster tightly at low zoom levels and overlap each other, so a
  // real Playwright mouse click often lands on a sibling marker sitting on
  // top in z-order rather than the one the selector names. Dispatching a
  // native .click() through the DOM instead still bubbles up to Leaflet's
  // own listener (bound to the marker's wrapping element), without needing
  // the target to be the topmost element at its on-screen position.
  async function clickMarker(page, selector) {
    await page.waitForSelector(selector);
    await page.$eval(selector, (el) => el.click());
  }

  async function openPage({ colorScheme } = {}) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme });
    const page = await context.newPage();
    await page.route('https://*.tile.openstreetmap.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE }));
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
    await page.click('#stats-toggle');
    await page.waitForSelector('#stats-panel.stats-panel--open');
    return { context, page };
  }

  it('shows one country-level marker per country with no country, city, or venue filter active', async function () {
    const { context, page } = await openPage();
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const countryOptionCount = await page.$$eval('#f-country option', (els) => els.length - 1); // drop "All"
    const markerCount = await page.$$eval('.gig-map-marker', (els) => els.length);
    expect(markerCount, 'expected one marker per country').to.equal(countryOptionCount);
    await context.close();
  });

  it('stays at country level with only a performer filter active', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-performer', { index: 1 });
    await page.waitForTimeout(100);
    const hidden = await page.getAttribute('#stats-map-wrap', 'hidden');
    expect(hidden).to.equal(null);
    await page.waitForSelector('.gig-map-marker');
    // Whichever performer index 1 happens to be, their gigs are all in one
    // of the countries in Locations.md — any single country-level marker is
    // proof the map stayed at country level rather than switching to city.
    const titles = await page.$$eval('.gig-map-marker', (els) => els.map((el) => el.title));
    const countries = ['Australia', 'France', 'New Zealand', 'The Netherlands', 'United Kingdom', 'United States of America'];
    expect(titles.every((title) => countries.includes(title)), `expected only country titles, got ${titles}`).to.be.true;
    await context.close();
  });

  it('sets the country filter and switches to city-level pins when a country marker is clicked', async function () {
    const { context, page } = await openPage();
    await clickMarker(page, '.gig-map-marker[title="United Kingdom"]');
    await page.waitForFunction(() => document.getElementById('f-country').value === 'United Kingdom');

    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');
    const markerCounts = await page.$$eval('.gig-map-marker', (els) => els.map((el) => Number(el.textContent)));
    expect(markerCounts.length).to.be.greaterThan(1); // several UK cities in the data
    const londonMarker = await page.$('.gig-map-marker[title="London"]');
    expect(londonMarker, 'expected a city-level London marker').to.exist;
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

  it('shows venue-level pins when filtered by venue, even without a city or country filter', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-venue', { index: 1 });
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');
    await context.close();
  });

  it('sets the venue filter when a venue marker is clicked', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await clickMarker(page, '.gig-map-marker[title="Michael Fowler Centre, Wellington"]');
    await page.waitForFunction(() => document.getElementById('f-venue').value === 'Michael Fowler Centre');
    await context.close();
  });

  it('uses the same marker style at every level (#192)', async function () {
    const { context, page } = await openPage();
    await page.waitForSelector('.gig-map-marker');
    const countryStyle = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('.gig-map-marker'));
      return [style.backgroundColor, style.borderColor, style.color];
    });

    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');
    const venueStyle = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('.gig-map-marker'));
      return [style.backgroundColor, style.borderColor, style.color];
    });

    expect(venueStyle).to.deep.equal(countryStyle);
    await context.close();
  });

  it('shows city-level pins when filtered by country only', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-country', 'United Kingdom');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const markerCounts = await page.$$eval('.gig-map-marker', (els) => els.map((el) => Number(el.textContent)));
    expect(markerCounts.length).to.be.greaterThan(1); // several UK cities in the data
    await context.close();
  });

  it('aggregates every venue in a city onto one marker when only country is filtered', async function () {
    // London has many distinct venues in the data (Brixton Academy, KOKO,
    // Royal Albert Hall, ...) — with only a Country filter active, they must
    // collapse onto a single city-level marker rather than one pin each.
    const { context: cityContext, page: cityPage } = await openPage();
    await cityPage.selectOption('#f-city', 'London');
    await cityPage.waitForSelector('#stats-map-wrap:not([hidden])');
    await cityPage.waitForSelector('.gig-map-marker');
    const londonVenueMarkerCount = (await cityPage.$$eval('.gig-map-marker', (els) => els.length));
    const londonGigTotal = (await cityPage.$$eval('.gig-map-marker', (els) =>
      els.reduce((sum, el) => sum + Number(el.textContent), 0)));
    expect(londonVenueMarkerCount, 'expected London to have more than one venue in the data').to.be.greaterThan(1);
    await cityContext.close();

    const { context, page } = await openPage();
    await page.selectOption('#f-country', 'United Kingdom');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const londonMarker = await page.$('.gig-map-marker[title="London"]');
    expect(londonMarker, 'expected exactly one London marker').to.exist;
    expect(Number(await londonMarker.textContent())).to.equal(londonGigTotal);
    await context.close();
  });

  it('labels a venue-less marker "Unknown address" when filtered by city', async function () {
    // Glasgow's one gig (Coldplay at SECC) has an address in Locations.md,
    // not coordinates, so in venue-precision mode it falls back to the city
    // point — that marker should read as unresolved, not show "SECC".
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Glasgow');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const marker = await page.$('.gig-map-marker[title="Unknown address, Glasgow"]');
    expect(marker, 'expected an "Unknown address, Glasgow" marker').to.exist;
    expect(Number(await marker.textContent())).to.equal(1);
    await context.close();
  });

  it('sets the city filter, not a venue filter, when an "Unknown address" marker is clicked', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Glasgow');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await clickMarker(page, '.gig-map-marker[title="Unknown address, Glasgow"]');
    await page.waitForFunction(() => document.getElementById('f-city').value === 'Glasgow');
    expect(await page.$eval('#f-venue', (el) => el.value)).to.equal('');
    await context.close();
  });

  it('zooms in on mouse wheel (#146)', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    // Tile URLs carry the current zoom as their {z} segment, so a rising z
    // in later tile requests is proof the wheel actually zoomed the map
    // (scrollWheelZoom: false would leave every request at the initial z).
    const requestedZooms = [];
    page.on('request', (req) => {
      const match = req.url().match(/tile\.openstreetmap\.org\/(\d+)\//);
      if (match) requestedZooms.push(Number(match[1]));
    });

    const initialZoom = Math.max(...requestedZooms);
    const mapBox = await page.locator('#stats-map').boundingBox();
    await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
    await page.mouse.wheel(0, -200);
    // Leaflet debounces wheel input before applying a zoom step, then fetches
    // the new tiles.
    await page.waitForTimeout(500);
    expect(Math.max(...requestedZooms), 'expected a tile request at a higher zoom level after wheel scroll')
      .to.be.greaterThan(initialZoom);
    await context.close();
  });

  it('collapses co-located venue aliases onto one marker with a per-alias breakdown (#158)', async function () {
    // San Fran, Indigo and Stax are the same Wellington address under
    // different names over time (Locations.md gives them identical
    // coordinates) — they should read as one marker, not three.
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');

    const markers = await page.$$('.gig-map-marker[title*="San Fran"]');
    expect(markers.length, 'expected San Fran, Indigo and Stax to share a single marker').to.equal(1);

    const [marker] = markers;
    const title = await marker.getAttribute('title');
    expect(title).to.include('San Fran (12)');
    expect(title).to.include('Indigo (8)');
    expect(title).to.include('Stax (2)');
    expect(Number(await marker.textContent()), 'expected the badge to show the combined total').to.equal(22);
    await context.close();
  });

  it('selects the alphabetically first alias when a co-located venue marker is clicked (#158)', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await clickMarker(page, '.gig-map-marker[title*="San Fran"]');
    // Indigo, San Fran, Stax — Indigo sorts first alphabetically.
    await page.waitForFunction(() => document.getElementById('f-venue').value === 'Indigo');
    await context.close();
  });

  it('falls back to country-level pins when filters are cleared', async function () {
    const { context, page } = await openPage();
    await page.selectOption('#f-city', 'Wellington');
    await page.waitForSelector('.gig-map-marker');
    await page.click('#reset');
    await page.waitForSelector('#stats-map-wrap:not([hidden])');
    await page.waitForSelector('.gig-map-marker');
    const marker = await page.$('.gig-map-marker[title="New Zealand"]');
    expect(marker, 'expected a country-level marker after reset').to.exist;
    await context.close();
  });
});
