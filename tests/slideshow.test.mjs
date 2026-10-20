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
const GIG = '/posts/gigs/20090218-Datsuns-Underworld-London/';
const LABEL = ' - The Datsuns @ Underworld, London';

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
  const count = (page) => page.locator('.slideshow-count').textContent();

  // The count is re-rendered on the animation frame after the scroll
  // event, so read it by waiting for the value rather than sampling it —
  // a plain read straight after a click is one frame stale.
  async function expectStatus(page, expected) {
    try {
      await page.waitForFunction(
        (text) => document.querySelector('.slideshow-count').textContent === text,
        expected,
        { timeout: 5000 }
      );
    } catch {
      expect(await count(page)).to.equal(expected);
    }
  }

  it('shows the photo count and a scrollbar, and no buttons, without JavaScript', async function () {
    const { context, page } = await open({ javaScriptEnabled: false });
    expect(await status(page)).to.equal('14 photos' + LABEL);
    expect(await page.locator('.slideshow-prev').isVisible()).to.be.false;
    expect(await page.locator('.slideshow-next').isVisible()).to.be.false;
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.slideshow-track')).scrollbarWidth)).to.equal('auto');
    await context.close();
  });

  it('starts on the first photo with a live counter and both buttons shown', async function () {
    const { context, page } = await open();
    expect(await status(page)).to.equal('1 / 14' + LABEL);
    expect(await page.locator('.slideshow-prev').isVisible()).to.be.true;
    expect(await page.locator('.slideshow-next').isVisible()).to.be.true;
    await context.close();
  });

  it('steps one photo per click', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.locator('.slideshow-next').click();
    await expectStatus(page, '2 / 14');
    for (let i = 0; i < 12; i++) await page.locator('.slideshow-next').click();
    await expectStatus(page, '14 / 14');
    await page.locator('.slideshow-prev').click();
    await expectStatus(page, '13 / 14');
    await context.close();
  });

  it('wraps round: next on the last photo goes to the first, prev on the first to the last', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.locator('.slideshow-prev').click();
    await expectStatus(page, '14 / 14');
    await page.locator('.slideshow-next').click();
    await expectStatus(page, '1 / 14');
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

  it('wraps round on a swipe past either end, like the buttons', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    const swipe = (dx) => page.evaluate((delta) => {
      const track = document.querySelector('.slideshow-track');
      const touch = (x) => new Touch({ identifier: 1, target: track, clientX: x, clientY: 100 });
      const fire = (type, x, list) => track.dispatchEvent(new TouchEvent(type, {
        bubbles: true, touches: list ? [touch(x)] : [], changedTouches: [touch(x)]
      }));
      fire('touchstart', 200, true);
      fire('touchend', 200 + delta, false);
    }, dx);
    await swipe(120);
    await expectStatus(page, '14 / 14');
    await swipe(-120);
    await expectStatus(page, '1 / 14');
    await context.close();
  });

  it('wraps on a swipe past the end even when the strip rubber-bands under the finger', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.evaluate(() => {
      const track = document.querySelector('.slideshow-track');
      const touch = (x) => new Touch({ identifier: 1, target: track, clientX: x, clientY: 100 });
      track.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(200)], changedTouches: [touch(200)] }));
      // iOS lets the strip stretch past its end while the finger drags.
      track.style.scrollSnapType = 'none';
      track.scrollLeft = 25;
      track.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(320)] }));
    });
    await expectStatus(page, '14 / 14');
    await context.close();
  });

  it('wraps on a trackpad swipe past either end, once per gesture', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.locator('.slideshow-track').hover();
    await page.mouse.wheel(-40, 0);
    await expectStatus(page, '14 / 14');
    // Momentum from the same gesture must not scroll on through the photos.
    await page.mouse.wheel(-40, 0);
    await page.mouse.wheel(-40, 0);
    await page.waitForTimeout(100);
    await expectStatus(page, '14 / 14');
    await page.waitForTimeout(300);
    await page.mouse.wheel(40, 0);
    await expectStatus(page, '1 / 14');
    await context.close();
  });

  it('leaves a trackpad swipe between photos alone', async function () {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.locator('.slideshow-next').click();
    await page.locator('.slideshow-track').hover();
    await page.mouse.wheel(-40, 0);
    await page.waitForTimeout(300);
    await expectStatus(page, '2 / 14');
    await context.close();
  });
});
