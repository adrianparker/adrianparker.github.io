/**
 * Analytics configuration and custom events.
 *
 * The remote PostHog script is blocked throughout. That is what keeps its
 * queueing stub in place: once the real script loads it replaces
 * window.posthog wholesale, so captures become unobservable. With it blocked,
 * window.posthog stays an array and every call is appended to it.
 */

const { expect } = require('chai');
const { chromium } = require('playwright');
const { startServer, stopServer } = require('./utils/http-server');

const PORT = 3002;
const BASE = `http://localhost:${PORT}`;

describe('Analytics', function () {
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

  /** A context with the remote PostHog script blocked. */
  async function newContext() {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).hostname.includes('posthog')
        ? route.abort()
        : route.continue()
    );
    return context;
  }

  /** Capture calls sitting in the stub's queue. */
  const captured = (page) =>
    page.evaluate(() =>
      (Array.isArray(window.posthog) ? window.posthog : [])
        .filter((entry) => Array.isArray(entry) && entry[0] === 'capture')
        .map((entry) => ({ name: entry[1], props: entry[2] || {} }))
    );

  describe('configuration', function () {
    it('sets no cookies', async function () {
      // The whole point: the default persistence is cookies, and this site is
      // meant to be cookie-free.
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);

      expect(await context.cookies()).to.be.an('array').that.is.empty;
      await context.close();
    });

    it('is configured for localStorage, anonymous profiles and DNT', async function () {
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);

      const config = await page.evaluate(() => {
        const c = window.posthog && window.posthog.config;
        return c ? { persistence: c.persistence, profiles: c.person_profiles, dnt: c.respect_dnt } : null;
      });

      expect(config, 'posthog initialised').to.not.be.null;
      expect(config.persistence).to.equal('localStorage');
      expect(config.profiles).to.equal('identified_only');
      expect(config.dnt).to.equal(true);
      await context.close();
    });

    it('loads exactly one analytics snippet per page', async function () {
      for (const path of ['/index.html', '/ExifCmdLine/index.html']) {
        const context = await newContext();
        const page = await context.newPage();
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        const count = await page.evaluate(() =>
          [...document.querySelectorAll('script')].filter((s) => /posthog\.init/.test(s.textContent || '')).length
        );
        expect(count, `${path}: one snippet`).to.equal(1);
        await context.close();
      }
    });
  });

  describe('custom events', function () {
    it('records outbound link clicks with the destination host', async function () {
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

      await page.evaluate(() => document.querySelector('a[href*="github.com"]').click());

      const events = await captured(page);
      const outbound = events.find((e) => e.name === 'outbound_link_clicked');
      expect(outbound, 'outbound event').to.exist;
      expect(outbound.props.host).to.equal('github.com');
      expect(outbound.props.label).to.equal('GitHub');
      await context.close();
    });

    it('does not record internal links as outbound', async function () {
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

      // Internal links navigate, which would tear down the page before the
      // queue can be read. preventDefault stops the navigation; the event
      // still bubbles to the delegated handler on document.
      await page.evaluate(() => {
        const link = document.querySelector('a[href="/posts/"]');
        link.addEventListener('click', (e) => e.preventDefault(), { once: true });
        link.click();
      });

      const events = await captured(page);
      expect(events.filter((e) => e.name === 'outbound_link_clicked')).to.be.empty;
      await context.close();
    });

    it('records RSS clicks separately from outbound links', async function () {
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

      await page.evaluate(() => document.querySelector('a[href="/feed.xml"]').click());

      const events = await captured(page);
      expect(events.some((e) => e.name === 'rss_clicked'), 'rss event').to.be.true;
      await context.close();
    });

    it('records which theme people switch to', async function () {
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

      await page.click('#theme-toggle');

      const events = await captured(page);
      const toggled = events.find((e) => e.name === 'theme_toggled');
      expect(toggled, 'theme event').to.exist;
      expect(toggled.props.to).to.be.oneOf(['light', 'dark']);
      await context.close();
    });

    it('records 404 hits with the path that was missed', async function () {
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/404.html`, { waitUntil: 'networkidle' });

      const events = await captured(page);
      const notFound = events.find((e) => e.name === 'not_found');
      expect(notFound, 'not_found event').to.exist;
      expect(notFound.props).to.have.property('path');
      await context.close();
    });

    it('wires the EXIF Viewer without touching its bundle', async function () {
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/ExifCmdLine/index.html`, { waitUntil: 'networkidle' });

      const wired = await page.evaluate(() => ({
        input: !!document.getElementById('file-input'),
        analytics: !!window.siteAnalytics
      }));
      expect(wired.input, 'file input present').to.be.true;
      expect(wired.analytics, 'analytics helper available').to.be.true;
      await context.close();
    });

    it('never sends a filename', async function () {
      // Filenames routinely contain names, places and dates. The event
      // deliberately carries only type and rounded size.
      const context = await newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/ExifCmdLine/index.html`, { waitUntil: 'domcontentloaded' });

      const source = await page.evaluate(() =>
        [...document.querySelectorAll('script')].map((s) => s.textContent || '').join('\n')
      );
      expect(source).to.contain('exif_file_loaded');
      expect(source).to.not.match(/file\.name|files\[0\]\.name/);
      await context.close();
    });
  });

  describe('third-party requests', function () {
    it('loads no stylesheet or font from a CDN', async function () {
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      const page = await context.newPage();

      const hosts = new Set();
      page.on('request', (r) => {
        const host = new URL(r.url()).hostname;
        if (host !== 'localhost') hosts.add(`${r.resourceType()}:${host}`);
      });

      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

      const offenders = [...hosts].filter((h) => !h.includes('posthog'));
      expect(offenders, `unexpected third-party requests: ${offenders.join(', ')}`).to.be.empty;
      await context.close();
    });

    it('serves Pure.css and each theme\'s heading webfont from this origin', async function () {
      // Dark renders headings in Bebas Neue, light in Architects Daughter —
      // neither loads unless it's the one actually applied, so each needs
      // its own colour scheme rather than one shared assertion.
      for (const [colorScheme, font] of [['dark', 'Bebas Neue'], ['light', 'Architects Daughter']]) {
        const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, colorScheme });
        const page = await context.newPage();
        await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

        const local = await page.evaluate(async (fontName) => {
          await document.fonts.ready;
          return {
            sheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')),
            fontLoaded: document.fonts.check(`1em "${fontName}"`)
          };
        }, font);

        local.sheets.forEach((href) => {
          expect(href, `${href} is same-origin`).to.match(/^\//);
        });
        expect(local.fontLoaded, `${font} available in ${colorScheme} theme`).to.be.true;
        await context.close();
      }
    });
  });
});
