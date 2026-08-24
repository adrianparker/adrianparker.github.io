/**
 * Behavioural tests for Gig Tracker's mutual dropdown filtering (#118).
 *
 * When a dropdown filter is active, the *other* dropdowns should only offer
 * values that are actually reachable given the active filter(s) — e.g.
 * picking a country should narrow the city list to cities in that country.
 * The active filter's own dropdown must keep its full option list, and
 * clearing filters must restore every dropdown to its full list.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme 3001, analytics 3002, visual 3000, active-indicator 3003.
const PORT = 3004;
const BASE = `http://localhost:${PORT}`;

describe('Gig Tracker adaptive dropdown filters', function () {
  this.timeout(60000);

  let browser;
  let context;
  let page;

  before(async function () {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  });

  after(async function () {
    if (browser) await browser.close();
    await stopServer();
  });

  beforeEach(async function () {
    context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    page = await context.newPage();
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
  });

  afterEach(async function () {
    await context.close();
  });

  const optionsOf = (page, selector) =>
    page.$eval(selector, (sel) => Array.from(sel.options).map((o) => o.value).filter(Boolean));

  // Real gig-history data: Australia has gigs in exactly one city (Sydney),
  // which makes it a deterministic fixture for narrowing assertions without
  // needing to hardcode the whole dataset's shape.
  const SINGLE_CITY_COUNTRY = 'Australia';
  const SINGLE_CITY_COUNTRY_CITY = 'Sydney';

  it('narrows the city, venue and show dropdowns when a country with one city is selected', async function () {
    const fullCities = await optionsOf(page, '#f-city');
    expect(fullCities.length).to.be.greaterThan(1);

    await page.selectOption('#f-country', SINGLE_CITY_COUNTRY);

    const narrowedCities = await optionsOf(page, '#f-city');
    expect(narrowedCities).to.deep.equal([SINGLE_CITY_COUNTRY_CITY]);

    const rowVenues = await page.$$eval('#tbody tr', (rows) =>
      rows.map((r) => r.children[5].textContent.trim())
    );
    const venueOptions = await optionsOf(page, '#f-venue');
    expect(venueOptions.every((v) => rowVenues.includes(v))).to.be.true;
  });

  it('keeps the active filter\'s own dropdown showing its full option list', async function () {
    const fullCountries = await optionsOf(page, '#f-country');

    await page.selectOption('#f-country', SINGLE_CITY_COUNTRY);

    const countriesAfter = await optionsOf(page, '#f-country');
    expect(countriesAfter).to.deep.equal(fullCountries);
  });

  it('narrows the country dropdown when a city is selected (reverse relationship)', async function () {
    await page.selectOption('#f-city', SINGLE_CITY_COUNTRY_CITY);

    const countries = await optionsOf(page, '#f-country');
    expect(countries).to.deep.equal([SINGLE_CITY_COUNTRY]);
  });

  it('restores full option lists on every dropdown after Clear filters', async function () {
    const fullCities = await optionsOf(page, '#f-city');
    const fullVenues = await optionsOf(page, '#f-venue');

    await page.selectOption('#f-country', SINGLE_CITY_COUNTRY);
    expect(await optionsOf(page, '#f-city')).to.not.deep.equal(fullCities);

    await page.click('#reset');

    expect(await optionsOf(page, '#f-city')).to.deep.equal(fullCities);
    expect(await optionsOf(page, '#f-venue')).to.deep.equal(fullVenues);
  });

  it('leaves the search field independent of dropdown option narrowing', async function () {
    const fullCountries = await optionsOf(page, '#f-country');

    await page.fill('#search', SINGLE_CITY_COUNTRY_CITY);

    expect(await optionsOf(page, '#f-country')).to.deep.equal(fullCountries);
  });
});
