/**
 * Behavioural tests for the Gig Tracker filter bar's "active" indicator.
 *
 * A filter or the search box gets a persistent outline whenever it has a
 * non-default value, so it's visible which filters are active without
 * needing focus. The CSS in gig-history.css deliberately shares one rule
 * between :focus-visible and .is-active (see the comment there) so the two
 * are pixel-identical by construction — this test checks that construction
 * holds, in both themes. If it ever fails, the shared rule has drifted apart
 * and the indicator needs fixing to match focus again.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: theme holds 3001, analytics 3002, visual 3000.
const PORT = 3003;
const BASE = `http://localhost:${PORT}`;

describe('Gig Tracker filter active indicator', function () {
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

  async function open(colorScheme) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, colorScheme });
    const page = await context.newPage();
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
    return { context, page };
  }

  const outlineOf = (page, selector) =>
    page.$eval(selector, (el) => getComputedStyle(el).outline);

  ['dark', 'light'].forEach((colorScheme) => {
    describe(`${colorScheme} mode`, function () {
      it('gives a select the same outline when active as when focused', async function () {
        const { context, page } = await open(colorScheme);

        const unfocused = await outlineOf(page, '#f-performer');
        await page.focus('#f-performer');
        const focused = await outlineOf(page, '#f-performer');
        expect(focused, 'focus changes the outline').to.not.equal(unfocused);
        await page.evaluate(() => document.getElementById('f-performer').blur());

        await page.selectOption('#f-performer', { index: 1 });
        const active = await outlineOf(page, '#f-performer');
        expect(active, 'active outline matches focus outline').to.equal(focused);

        await context.close();
      });

      it('gives the search box the same outline when active as when focused', async function () {
        const { context, page } = await open(colorScheme);

        await page.focus('#search');
        const focused = await outlineOf(page, '#search');
        await page.type('#search', 'alice');
        const active = await outlineOf(page, '#search');
        expect(active, 'active outline matches focus outline').to.equal(focused);

        await context.close();
      });

      it('gives the reset button the same outline when a filter is active as when focused', async function () {
        const { context, page } = await open(colorScheme);

        await page.focus('#reset');
        const focused = await outlineOf(page, '#reset');
        await page.evaluate(() => document.getElementById('reset').blur());

        await page.selectOption('#f-venue', { index: 1 });
        const active = await outlineOf(page, '#reset');
        expect(active, 'active outline matches focus outline').to.equal(focused);

        await context.close();
      });

      it('gives the reset button label the same colour when a filter is active as when hovered', async function () {
        const { context, page } = await open(colorScheme);
        const colorOf = (sel) => page.$eval(sel, (el) => getComputedStyle(el).color);

        const resting = await colorOf('#reset');
        await page.hover('#reset');
        const hovered = await colorOf('#reset');
        expect(hovered, 'hover changes the label colour').to.not.equal(resting);
        await page.mouse.move(0, 0);

        await page.selectOption('#f-venue', { index: 1 });
        const active = await colorOf('#reset');
        expect(active, 'active label colour matches hover colour').to.equal(hovered);

        await context.close();
      });

      it('clears the indicator when filters are reset', async function () {
        const { context, page } = await open(colorScheme);

        const baseline = await outlineOf(page, '#f-performer');
        await page.selectOption('#f-performer', { index: 1 });
        expect(await outlineOf(page, '#f-performer'), 'active after selecting').to.not.equal(baseline);
        expect(await outlineOf(page, '#reset'), 'reset active after selecting').to.not.equal(baseline);

        await page.click('#reset');
        expect(await outlineOf(page, '#f-performer'), 'inactive after reset').to.equal(baseline);
        expect(await outlineOf(page, '#reset'), 'reset inactive after reset').to.equal(baseline);

        await context.close();
      });
    });
  });
});
