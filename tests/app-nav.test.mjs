/**
 * Behavioural tests for the app-nav hamburger sheet's keyboard behaviour
 * (#99): Escape closes it, focus moves into it on open and back to the
 * toggle button on close, and Tab is trapped inside it while open.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme holds 3001, analytics 3002, gig-tracker 3003.
const PORT = 3004;
const BASE = `http://localhost:${PORT}`;

describe('App-nav hamburger sheet', function () {
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

  async function open() {
    const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
    return { context, page };
  }

  it('opens the sheet and moves focus to the first nav link', async function () {
    const { context, page } = await open();
    await page.click('#app-nav-menu');
    const opened = await page.evaluate(() => document.documentElement.dataset.appNavSheet);
    expect(opened).to.equal('open');
    const focused = await page.evaluate(() => document.activeElement.className);
    expect(focused).to.include('app-nav-link');
    await context.close();
  });

  it('closes the sheet on Escape and returns focus to the toggle button', async function () {
    const { context, page } = await open();
    await page.click('#app-nav-menu');
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => document.documentElement.dataset.appNavSheet);
    expect(closed).to.equal('closed');
    const expanded = await page.getAttribute('#app-nav-menu', 'aria-expanded');
    expect(expanded).to.equal('false');
    const focusedId = await page.evaluate(() => document.activeElement.id);
    expect(focusedId).to.equal('app-nav-menu');
    await context.close();
  });

  it('traps Tab focus inside the sheet while it is open', async function () {
    const { context, page } = await open();
    await page.click('#app-nav-menu');
    // Tab from the first focused link all the way through the sheet; the
    // last press should wrap back to the first link instead of leaving.
    const focusableCount = await page.evaluate(() =>
      document.querySelectorAll('#app-nav a[href], #app-nav button:not([disabled])').length
    );
    for (let i = 0; i < focusableCount; i++) {
      await page.keyboard.press('Tab');
    }
    const wrapped = await page.evaluate(() => document.activeElement.className);
    expect(wrapped).to.include('app-nav-link');
    await context.close();
  });

  it('leaves the toggle button state closed when the sheet has never been opened', async function () {
    const { context, page } = await open();
    const state = await page.evaluate(() => document.documentElement.dataset.appNavSheet);
    expect(state).to.satisfy((v) => v === undefined || v === 'closed');
    await context.close();
  });
});
