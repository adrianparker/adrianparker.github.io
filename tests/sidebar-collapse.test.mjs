/**
 * Behavioural tests for the sidebar's collapse to a rail.
 *
 * Every desktop page, content and app alike, uses the same sidebar, so the
 * collapse is checked on one of each. The state lives in localStorage.appNav
 * and is applied to <html data-app-nav> by the inline script in head.njk.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: see the other suites' PORT constants for what is taken.
const PORT = 3012;
const BASE = `http://localhost:${PORT}`;

const POST = '/posts/gigs/20261029-Mudhoney-Meow-Nui-Wellington/index.html';
const APP = '/Gig-History/index.html';

describe('Sidebar collapse', function () {
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

  async function open(path, { width = 1200, stored = null } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    if (stored) {
      await context.addInitScript((value) => {
        try { localStorage.setItem('appNav', value); } catch (e) { /* ignore */ }
      }, stored);
    }
    const page = await context.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    return { context, page };
  }

  const state = (page) => page.evaluate(() => ({
    attr: document.documentElement.dataset.appNav,
    stored: localStorage.getItem('appNav'),
    width: Math.round(document.querySelector('.sidebar').getBoundingClientRect().width)
  }));

  const visible = (page, selector) =>
    page.$eval(selector, (el) => getComputedStyle(el).display !== 'none');

  [['a post page', POST], ['an app page', APP]].forEach(([label, path]) => {
    describe(`on ${label}`, function () {
      it('collapses to the rail, remembers it, and expands again', async function () {
        const { context, page } = await open(path);

        expect((await state(page)).width, 'expanded width').to.equal(250);
        expect(await visible(page, '.sidebar-rail'), 'rail hidden when expanded').to.be.false;
        expect(await page.getAttribute('#sidebar-collapse', 'aria-expanded')).to.equal('true');

        await page.click('#sidebar-collapse');
        await page.waitForTimeout(300);

        const collapsed = await state(page);
        expect(collapsed.attr).to.equal('collapsed');
        expect(collapsed.stored).to.equal('collapsed');
        expect(collapsed.width, 'rail width').to.equal(92);
        expect(await visible(page, '.sidebar-rail'), 'rail shown').to.be.true;
        expect(await visible(page, '.custom-restricted-width'), 'lists hidden').to.be.false;
        expect(await page.getAttribute('#sidebar-collapse', 'aria-expanded')).to.equal('false');
        expect(await page.getAttribute('#sidebar-collapse', 'aria-label')).to.equal('Expand navigation');

        await page.reload({ waitUntil: 'networkidle' });
        expect((await state(page)).attr, 'survives a reload').to.equal('collapsed');
        expect((await state(page)).width).to.equal(92);

        await page.click('#sidebar-collapse');
        await page.waitForTimeout(300);
        const expanded = await state(page);
        expect(expanded.attr).to.equal('expanded');
        expect(expanded.stored).to.equal('expanded');
        expect(expanded.width).to.equal(250);
        await context.close();
      });
    });
  });

  it('follows the reader from a post page to an app page', async function () {
    const { context, page } = await open(POST);
    await page.click('#sidebar-collapse');
    await page.goto(`${BASE}${APP}`, { waitUntil: 'networkidle' });
    expect((await state(page)).attr).to.equal('collapsed');
    expect(await visible(page, '.sidebar-rail')).to.be.true;
    await context.close();
  });

  it('marks the current section in the rail', async function () {
    const { context, page } = await open(POST, { stored: 'collapsed' });
    const current = await page.$$eval('.sidebar-rail-link[aria-current="true"]',
      (links) => links.map((a) => a.getAttribute('aria-label')));
    expect(current).to.deep.equal(['Gigs']);
    await context.close();
  });

  it('gives every rail control a 44px target', async function () {
    const { context, page } = await open(APP, { stored: 'collapsed' });
    const sizes = await page.$$eval(
      '.sidebar-rail-link, .sidebar .theme-toggle, #sidebar-collapse',
      (els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height)];
      })
    );
    expect(sizes).to.have.lengthOf(5);
    sizes.forEach(([w, h]) => {
      expect(w).to.be.at.least(44);
      expect(h).to.be.at.least(44);
    });
    await context.close();
  });

  describe('below the breakpoint', function () {
    it('ignores a stored collapse on a post page', async function () {
      const { context, page } = await open(POST, { width: 390, stored: 'collapsed' });
      expect(await visible(page, '.sidebar-rail'), 'no rail').to.be.false;
      expect(await visible(page, '#sidebar-collapse'), 'no collapse button').to.be.false;
      expect(await visible(page, '.mobile-menu'), 'mobile menu').to.be.true;
      const width = await page.$eval('.sidebar', (el) => el.getBoundingClientRect().width);
      expect(width, 'full-width header').to.equal(390);
      await context.close();
    });

    it('hides the sidebar on an app page, leaving the app bar', async function () {
      const { context, page } = await open(APP, { width: 390, stored: 'collapsed' });
      expect(await visible(page, '.sidebar'), 'sidebar hidden').to.be.false;
      expect(await visible(page, '.app-nav-bar'), 'app bar shown').to.be.true;
      await context.close();
    });
  });

  describe('without JavaScript', function () {
    it('offers no collapse and no rail', async function () {
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`${BASE}${POST}`, { waitUntil: 'networkidle' });
      expect(await visible(page, '#sidebar-collapse')).to.be.false;
      expect(await visible(page, '.sidebar-rail')).to.be.false;
      expect(await visible(page, '.custom-restricted-width'), 'expanded lists').to.be.true;
      await context.close();
    });
  });
});
