/**
 * Behavioural tests for the light/dark theme.
 *
 * The toggle's script is inline in <head> by necessity — it has to run before
 * the stylesheet to avoid a flash of the wrong theme — so it cannot be unit
 * tested. These cover it instead.
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

// Its own port: the visual suite holds 3000 and both run under `npm test`.
const PORT = 3001;
const BASE = `http://localhost:${PORT}`;

const DARK_BG = 'rgb(51, 51, 51)';
const LIGHT_BG = 'rgb(238, 232, 216)';

describe('Theme', function () {
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

  async function open({ colorScheme = 'dark', stored = null, javaScriptEnabled = true } = {}) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      colorScheme,
      javaScriptEnabled
    });
    if (stored) {
      await context.addInitScript((value) => {
        try { localStorage.setItem('theme', value); } catch (e) { /* ignore */ }
      }, stored);
    }
    const page = await context.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    return { context, page };
  }

  const bg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  describe('operating system preference', function () {
    it('follows a dark OS preference when nothing is stored', async function () {
      const { context, page } = await open({ colorScheme: 'dark' });
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).to.be.undefined;
      expect(await bg(page)).to.equal(DARK_BG);
      await context.close();
    });

    it('follows a light OS preference when nothing is stored', async function () {
      const { context, page } = await open({ colorScheme: 'light' });
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).to.be.undefined;
      expect(await bg(page)).to.equal(LIGHT_BG);
      await context.close();
    });
  });

  describe('toggling', function () {
    it('switches from dark to light and back', async function () {
      const { context, page } = await open({ colorScheme: 'dark' });

      expect(await bg(page), 'starts dark').to.equal(DARK_BG);
      await page.click('#theme-toggle');
      expect(await bg(page), 'switched to light').to.equal(LIGHT_BG);
      await page.click('#theme-toggle');
      expect(await bg(page), 'switched back to dark').to.equal(DARK_BG);

      await context.close();
    });

    it('overrides the OS preference in both directions', async function () {
      const { context, page } = await open({ colorScheme: 'light' });
      await page.click('#theme-toggle');
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).to.equal('dark');
      expect(await bg(page)).to.equal(DARK_BG);
      await context.close();
    });

    it('describes the theme you will get, not the one you are in', async function () {
      const { context, page } = await open({ colorScheme: 'dark' });
      const read = () => page.evaluate(() => ({
        label: document.querySelector('.theme-toggle-label').textContent.trim(),
        aria: document.getElementById('theme-toggle').getAttribute('aria-label')
      }));

      expect(await read()).to.deep.equal({ label: 'Light', aria: 'Switch to light theme' });
      await page.click('#theme-toggle');
      expect(await read()).to.deep.equal({ label: 'Dark', aria: 'Switch to dark theme' });

      await context.close();
    });
  });

  describe('persistence', function () {
    it('survives a reload', async function () {
      const { context, page } = await open({ colorScheme: 'dark' });
      await page.click('#theme-toggle');
      await page.reload({ waitUntil: 'networkidle' });
      expect(await bg(page)).to.equal(LIGHT_BG);
      await context.close();
    });

    it('applies a stored preference over the OS preference', async function () {
      const { context, page } = await open({ colorScheme: 'dark', stored: 'light' });
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).to.equal('light');
      expect(await bg(page)).to.equal(LIGHT_BG);
      await context.close();
    });
  });

  describe('no flash of the wrong theme', function () {
    it('runs the theme script before the stylesheet', async function () {
      // Structural guarantee: if the stylesheet were parsed first the page
      // would paint in the OS theme and then snap to the stored one.
      const html = fs.readFileSync(
        path.join(process.cwd(), '_site', 'index.html'),
        'utf8'
      );
      const script = html.indexOf('localStorage.getItem(\'theme\')');
      const stylesheet = html.indexOf('/index.css');

      expect(script, 'inline theme script present').to.be.greaterThan(-1);
      expect(stylesheet, 'stylesheet link present').to.be.greaterThan(-1);
      expect(script, 'theme script precedes the stylesheet').to.be.lessThan(stylesheet);
    });

    it('has the theme applied before the first paint', async function () {
      const context = await browser.newContext({
        viewport: { width: 1200, height: 800 },
        colorScheme: 'dark'
      });
      await context.addInitScript(() => {
        try { localStorage.setItem('theme', 'light'); } catch (e) { /* ignore */ }
      });
      const page = await context.newPage();

      // Sample as early as the document is available, well before load.
      await page.goto(`${BASE}/index.html`, { waitUntil: 'commit' });
      const early = await page.evaluate(() => ({
        readyState: document.readyState,
        theme: document.documentElement.dataset.theme
      }));

      expect(early.theme, `theme already set at readyState=${early.readyState}`).to.equal('light');
      await context.close();
    });
  });

  describe('without JavaScript', function () {
    it('hides the toggle rather than offering a dead control', async function () {
      const { context, page } = await open({ javaScriptEnabled: false });
      const display = await page.$eval('#theme-toggle', (el) => getComputedStyle(el).display);
      expect(display).to.equal('none');
      await context.close();
    });

    it('still renders a usable site', async function () {
      const { context, page } = await open({ javaScriptEnabled: false });
      expect(await bg(page), 'falls back to the OS preference').to.equal(DARK_BG);
      expect(await page.$$eval('.pure-menu-list a', (a) => a.length)).to.be.greaterThan(5);
      await context.close();
    });
  });

  describe('icons follow the theme', function () {
    it('colours the masked icons from the text token in both themes', async function () {
      for (const [scheme, expected] of [['dark', 'rgb(204, 204, 204)'], ['light', 'rgb(30, 42, 58)']]) {
        const { context, page } = await open({ colorScheme: scheme });
        const colours = await page.evaluate(() => {
          const before = (sel) => getComputedStyle(document.querySelector(sel), '::before');
          return {
            external: getComputedStyle(document.querySelector('.external-link-icon')).backgroundColor,
            rss: before('.rss-button').backgroundColor,
            x: before('.twitter-follow-button').backgroundColor
          };
        });
        expect(colours.external, `${scheme} external-link icon`).to.equal(expected);
        expect(colours.rss, `${scheme} RSS icon`).to.equal(expected);
        expect(colours.x, `${scheme} X icon`).to.equal(expected);
        await context.close();
      }
    });

    it('masks every icon rather than relying on baked-in colour', async function () {
      const { context, page } = await open();
      const masked = await page.evaluate(() => {
        const before = (sel) => getComputedStyle(document.querySelector(sel), '::before').maskImage;
        return {
          external: getComputedStyle(document.querySelector('.external-link-icon')).maskImage,
          rss: before('.rss-button'),
          x: before('.twitter-follow-button'),
          toggle: getComputedStyle(document.querySelector('.theme-toggle-icon')).maskImage
        };
      });
      Object.entries(masked).forEach(([name, value]) => {
        expect(value, `${name} is masked`).to.not.equal('none');
      });
      await context.close();
    });
  });
});
