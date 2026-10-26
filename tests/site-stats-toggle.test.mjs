/**
 * The Site Stats "Include gig reviews" toggle needs no JavaScript: the
 * checkbox state is read by CSS :has(). These run with JavaScript disabled
 * to prove it.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: visual holds 3000, theme 3001, analytics 3002.
const PORT = 3003;
const URL = `http://localhost:${PORT}/Site-Stats/index.html`;

describe('Site Stats gig-review toggle', function () {
  this.timeout(60000);

  let browser;
  let context;
  let page;

  before(async function () {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    context = await browser.newContext({ viewport: { width: 1200, height: 800 }, javaScriptEnabled: false });
    page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
  });

  after(async function () {
    if (browser) await browser.close();
    await stopServer();
  });

  const visibleIntro = () => page.locator('.ss-read-intro .ss-intro:visible').allTextContents();
  const visibleCharts = () => page.locator('.ss-read > .ss-without-gigs:visible, .ss-read > .ss-with-gigs:visible')
    .evaluateAll((els) => els.map((el) => el.className));

  it('starts unchecked, showing posts without gig reviews', async function () {
    expect(await page.isChecked('#ss-include-gigs')).to.equal(false);
    expect(await visibleIntro()).to.deep.equal(['Posts ranked by views, gig reviews excluded.']);
    expect(await visibleCharts()).to.deep.equal(['ss-without-gigs']);
  });

  it('switches sentence and chart when checked, without JavaScript', async function () {
    await page.click('label.ss-toggle');
    expect(await page.isChecked('#ss-include-gigs')).to.equal(true);
    expect(await visibleIntro()).to.deep.equal(['Posts ranked by views, gig reviews included.']);
    expect(await visibleCharts()).to.deep.equal(['ss-with-gigs']);
  });

  it('keeps the hidden chart out of the accessibility tree', async function () {
    const hidden = await page.locator('.ss-read > .ss-without-gigs').evaluate((el) => getComputedStyle(el).display);
    expect(hidden).to.equal('none');
  });

  it('switches back when unchecked', async function () {
    await page.click('label.ss-toggle');
    expect(await visibleIntro()).to.deep.equal(['Posts ranked by views, gig reviews excluded.']);
  });
});
