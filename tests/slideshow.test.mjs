/**
 * Behavioural tests for the photo slideshow's enhancement script
 * (static/slideshow.js), which cannot be unit tested: it only does anything
 * against a real scroll container. The markup itself is covered in
 * tests/unit/slideshow.test.mjs.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: the visual suite holds 3000, theme 3001, analytics 3002.
const PORT = 3003;
const BASE = `http://localhost:${PORT}`;
const GIG = '/posts/gigs/20090218-Datsuns-Astoria-London/';

describe('Slideshow', function () {
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

  async function open({ javaScriptEnabled = true, reducedMotion = 'no-preference' } = {}) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      javaScriptEnabled,
      reducedMotion
    });
    // The photos live on CloudFront. The frame has a fixed aspect ratio so
    // nothing about layout or scrolling depends on them arriving, and not
    // fetching them keeps this deterministic offline.
    await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    const page = await context.newPage();
    await page.goto(`${BASE}${GIG}`, { waitUntil: 'load' });
    return { context, page };
  }

  const status = (page) => page.locator('.slideshow-status').textContent();

  // The counter is re-rendered on the animation frame after the scroll
  // event, so read it by waiting for the value rather than sampling it —
  // a plain read straight after a click is one frame stale.
  async function expectStatus(page, expected) {
    try {
      await page.waitForFunction(
        (text) => document.querySelector('.slideshow-status').textContent === text,
        expected,
        { timeout: 5000 }
      );
    } catch {
      expect(await status(page)).to.equal(expected);
    }
  }

  it('shows the photo count and a scrollbar, and no buttons, without JavaScript', async function () {
    const { context, page } = await open({ javaScriptEnabled: false });
    expect(await status(page)).to.equal('14 photos');
    expect(await page.locator('.slideshow-prev').isVisible()).to.be.false;
    expect(await page.locator('.slideshow-next').isVisible()).to.be.false;
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.slideshow-track')).scrollbarWidth)).to.equal('auto');
    await context.close();
  });

  it('starts on the first photo with prev disabled and a live counter', async function () {
    const { context, page } = await open();
    expect(await status(page)).to.equal('1 / 14');
    expect(await page.locator('.slideshow-prev').isDisabled()).to.be.true;
    expect(await page.locator('.slideshow-next').isDisabled()).to.be.false;
    expect(await page.locator('.slideshow-prev').isVisible()).to.be.true;
    await context.close();
  });

  it('steps one photo per click and disables next on the last', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.locator('.slideshow-next').click();
    await expectStatus(page, '2 / 14');
    expect(await page.locator('.slideshow-prev').isDisabled()).to.be.false;

    for (let i = 0; i < 12; i++) await page.locator('.slideshow-next').click();
    await expectStatus(page, '14 / 14');
    expect(await page.locator('.slideshow-next').isDisabled()).to.be.true;

    await page.locator('.slideshow-prev').click();
    await expectStatus(page, '13 / 14');
    await context.close();
  });

  it('does not lose clicks made while a smooth scroll is still in flight', async function () {
    const { context, page } = await open();
    const next = page.locator('.slideshow-next');
    await next.click();
    await next.click();
    await next.click();
    await expectStatus(page, '4 / 14');
    await context.close();
  });

  it('steps whole photos with the arrow keys when the strip is focused', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.locator('.slideshow-track').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expectStatus(page, '3 / 14');
    await page.keyboard.press('ArrowLeft');
    await expectStatus(page, '2 / 14');
    await context.close();
  });

  it('follows a swipe or scroll the reader makes themselves', async function () {
    const { context, page } = await open();
    await page.evaluate(() => {
      const track = document.querySelector('.slideshow-track');
      track.scrollTo({ left: track.clientWidth * 5, behavior: 'auto' });
    });
    await expectStatus(page, '6 / 14');
    await context.close();
  });
});
