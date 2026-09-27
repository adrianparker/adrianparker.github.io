/**
 * Behavioural test for the setlist chip/modal on a gig review post (#185).
 * The markup itself (chip rendering, when the modal exists at all) is
 * covered by the smoke tests; this covers the inline behaviour script, which
 * only does anything in a real browser.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme 3001, analytics 3002, slideshow 3003, gig-tracker
// suites 3003-3009 (see their own files), visual 3000. See tests/*.test.mjs.
const PORT = 3010;
const BASE = `http://localhost:${PORT}`;
const GIG = '/posts/gigs/20260911-WASP-Wiltern-Los-Angeles/';

describe('Gig post setlist chip', function () {
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
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    // The modal image is fetched from setlist.fm. Aborting non-local
    // requests keeps this deterministic offline — only the <img src>
    // attribute is under test, not the actual image loading.
    await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    const page = await context.newPage();
    await page.goto(`${BASE}${GIG}`, { waitUntil: 'load' });
    return { context, page };
  }

  it('opens the modal with the setlist.fm image on chip click, and closes it with Esc', async function () {
    const { context, page } = await open();

    const overlay = page.locator('#setlist-modal-overlay');
    expect(await overlay.isHidden(), 'modal starts hidden').to.be.true;

    await page.locator('.setlist-chip[data-artist="W.A.S.P."]').click();

    await expect_visible(overlay);
    expect(await page.locator('#setlist-modal-title').textContent()).to.equal('W.A.S.P. — The Wiltern');
    expect(await page.locator('#setlist-modal-img').getAttribute('src'))
      .to.equal('https://www.setlist.fm/widgets/setlist-image-v1?id=34b29cb');

    await page.keyboard.press('Escape');
    expect(await overlay.isHidden(), 'Esc closes the modal').to.be.true;

    await context.close();
  });

  it('opens a different performer\'s setlist from their own chip', async function () {
    const { context, page } = await open();

    await page.locator('.setlist-chip[data-artist="KK\'s Priest"]').click();
    await expect_visible(page.locator('#setlist-modal-overlay'));
    expect(await page.locator('#setlist-modal-title').textContent()).to.equal("KK's Priest — The Wiltern");
    expect(await page.locator('#setlist-modal-img').getAttribute('src'))
      .to.equal('https://www.setlist.fm/widgets/setlist-image-v1?id=234b28ef');

    await context.close();
  });

  it('closes when clicking outside the modal', async function () {
    const { context, page } = await open();

    const overlay = page.locator('#setlist-modal-overlay');
    await page.locator('.setlist-chip[data-artist="W.A.S.P."]').click();
    await expect_visible(overlay);

    // Click the overlay itself, away from the modal box.
    await overlay.click({ position: { x: 5, y: 5 } });
    expect(await overlay.isHidden(), 'clicking outside closes the modal').to.be.true;

    await context.close();
  });

  async function expect_visible(locator) {
    await locator.page().waitForFunction(
      (el) => el && !el.hidden,
      await locator.elementHandle(),
      { timeout: 5000 }
    );
  }
});
