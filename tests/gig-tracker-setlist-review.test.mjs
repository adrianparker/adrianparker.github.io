/**
 * Behavioural tests for the Gig Tracker's setlist chip and review link (#182).
 *
 * A "Setlist" chip appears next to a performer's name when gig-history.md's
 * Setlist.fm ID column has an id for that specific performer, and opens a
 * lightbox with that performer's setlist.fm widget image. A "Read the
 * review" link appears under the whole row when a gig review post shares
 * that row's date, and every gig-history row sharing a review's date gets
 * the link, not just one.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme 3001, analytics 3002, gig-tracker 3003, filter-adaptation/app-nav 3004,
// stats-chart 3005, stats-toggle 3006, stats-map 3007.
const PORT = 3008;
const BASE = `http://localhost:${PORT}`;

describe('Gig Tracker setlist chip and review link', function () {
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
    await page.fill('#search', 'W.A.S.P.');
  });

  afterEach(async function () {
    if (context) await context.close();
  });

  function wasWiternRow() {
    return page.locator('#tbody tr', { hasText: '2026-09-11' });
  }

  it('shows a Setlist chip next to each performer with a setlist id', async function () {
    const row = wasWiternRow();
    expect(await row.locator('.setlist-chip').count()).to.equal(2);
  });

  it('does not show a Setlist chip for a performer with no setlist id', async function () {
    await page.fill('#search', '');
    await page.fill('#search', 'Hadestown');
    const row = page.locator('#tbody tr').first();
    expect(await row.locator('.setlist-chip').count()).to.equal(0);
  });

  it('opens a lightbox with the setlist.fm widget image on chip click', async function () {
    const row = wasWiternRow();
    const chip = row.locator('.setlist-chip').first();
    await chip.click();

    const overlay = page.locator('#setlist-modal-overlay');
    expect(await overlay.getAttribute('hidden')).to.equal(null);
    expect(await page.locator('#setlist-modal-title').textContent()).to.equal('W.A.S.P. — The Wiltern');
    expect(await page.locator('#setlist-modal-img').getAttribute('src'))
      .to.equal('https://www.setlist.fm/widgets/setlist-image-v1?id=34b29cb');
  });

  it('closes the lightbox on Escape', async function () {
    await wasWiternRow().locator('.setlist-chip').first().click();
    expect(await page.locator('#setlist-modal-overlay').getAttribute('hidden')).to.equal(null);

    await page.keyboard.press('Escape');
    expect(await page.locator('#setlist-modal-overlay').getAttribute('hidden')).to.equal('');
  });

  it('closes the lightbox on a backdrop click but not a card click', async function () {
    await wasWiternRow().locator('.setlist-chip').first().click();

    await page.locator('#setlist-modal-title').click();
    expect(await page.locator('#setlist-modal-overlay').getAttribute('hidden')).to.equal(null);

    await page.locator('#setlist-modal-overlay').click({ position: { x: 5, y: 5 } });
    expect(await page.locator('#setlist-modal-overlay').getAttribute('hidden')).to.equal('');
  });

  it('shows a Read the review link for a gig whose date matches a review post', async function () {
    const row = wasWiternRow();
    const link = row.locator('.review-link');
    expect(await link.count()).to.equal(1);
    expect(await link.textContent()).to.equal('Read the review');
    expect(await link.getAttribute('href')).to.equal('/posts/gigs/20260911-WASP-Wiltern-Los-Angeles/');
  });

  it('gives every gig-history row on that date the review link, not just one', async function () {
    await page.fill('#search', '');
    await page.fill('#search', '2026-09-04');
    const rows = page.locator('#tbody tr');
    const count = await rows.count();
    expect(count).to.be.greaterThan(1);
    for (let i = 0; i < count; i++) {
      expect(await rows.nth(i).locator('.review-link').count()).to.equal(1);
    }
  });

  it('omits the review link for a gig with no matching review post', async function () {
    await page.fill('#search', '');
    await page.fill('#search', 'Public Service Announcements');
    const row = page.locator('#tbody tr').first();
    expect(await row.locator('.review-link').count()).to.equal(0);
  });
});
