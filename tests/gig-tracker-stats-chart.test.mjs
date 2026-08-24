/**
 * Behavioural tests for the Gig Tracker statistics bar chart's hover
 * feedback: no tooltip for a month with zero gigs (#122), and a crosshair
 * that tracks the hovered bar (#121).
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme 3001, analytics 3002, gig-tracker 3003, app-nav 3004.
const PORT = 3005;
const BASE = `http://localhost:${PORT}`;

describe('Gig Tracker statistics chart hover', function () {
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

  async function openWithStatsPanel(page) {
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
    await page.click('#stats-toggle');
    await page.waitForSelector('#stats-panel.stats-panel--open');
    await page.waitForFunction(() => document.querySelectorAll('#stats-chart .stats-bar-group').length > 0);
  }

  async function groupTotals(page) {
    return page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('#stats-chart .stats-bar-group'));
      return groups.map(g => ({
        month: g.dataset.month,
        // A group with no gigs renders no <rect> segments beyond the hit area.
        total: g.querySelectorAll('rect:not(.stats-hit-area)').length > 0 ? 1 : 0
      }));
    });
  }

  async function hoverGroup(page, month) {
    const box = await page.evaluate((m) => {
      const group = document.querySelector(`.stats-bar-group[data-month="${m}"] .stats-hit-area`);
      const rect = group.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, month);
    await page.mouse.move(box.x, box.y);
  }

  it('shows no tooltip when hovering a month with zero gigs, if one exists', async function () {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    await openWithStatsPanel(page);

    const totals = await groupTotals(page);
    const zeroMonth = totals.find(t => t.total === 0);
    if (!zeroMonth) {
      this.skip(); // the current data has no gap month to exercise this on
    }

    await hoverGroup(page, zeroMonth.month);
    const hidden = await page.getAttribute('#stats-tooltip', 'hidden');
    expect(hidden).to.not.equal(null);
    await context.close();
  });

  it('shows a tooltip and crosshair when hovering a month with gigs', async function () {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    await openWithStatsPanel(page);

    const totals = await groupTotals(page);
    const activeMonth = totals.find(t => t.total > 0);
    expect(activeMonth, 'expected at least one month with gigs').to.exist;

    await hoverGroup(page, activeMonth.month);
    const hidden = await page.getAttribute('#stats-tooltip', 'hidden');
    expect(hidden).to.equal(null);

    const crosshairDisplay = await page.evaluate(() => ({
      x: document.getElementById('stats-crosshair-x').style.display,
      y: document.getElementById('stats-crosshair-y').style.display
    }));
    expect(crosshairDisplay.x).to.not.equal('none');
    expect(crosshairDisplay.y).to.not.equal('none');
    await context.close();
  });

  it('hides the tooltip and crosshair on mouseleave', async function () {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    await openWithStatsPanel(page);

    const totals = await groupTotals(page);
    const activeMonth = totals.find(t => t.total > 0);
    await hoverGroup(page, activeMonth.month);
    await page.hover('#stats-title'); // move outside the chart wrap
    await page.dispatchEvent('#stats-chart-wrap', 'mouseleave');

    const hidden = await page.getAttribute('#stats-tooltip', 'hidden');
    expect(hidden).to.not.equal(null);
    const crosshairDisplay = await page.evaluate(() => ({
      x: document.getElementById('stats-crosshair-x').style.display,
      y: document.getElementById('stats-crosshair-y').style.display
    }));
    expect(crosshairDisplay.x).to.equal('none');
    expect(crosshairDisplay.y).to.equal('none');
    await context.close();
  });
});
