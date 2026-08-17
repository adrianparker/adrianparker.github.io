/**
 * Smoke tests for the Eleventy build.
 *
 * These assert on the rendered DOM rather than on substrings of the built
 * CSS. The previous versions checked that _site/index.css contained the
 * literal text ".video-wrapper" and ".gig-metadata", which broke on any
 * CSS rename even when the site was perfectly correct, and passed happily
 * if the class was in the stylesheet but missing from the page.
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const SITE = path.join(process.cwd(), '_site');

const sitePath = (...parts) => path.join(SITE, ...parts);
const read = (...parts) => fs.readFileSync(sitePath(...parts), 'utf8');
const load = (...parts) => cheerio.load(read(...parts));

const VIDEO_POST = ['posts', 'Last-Ever-Last-Ever', 'index.html'];
const GIG_POST = ['posts', 'gigs', '20090218-Datsuns-Astoria-London', 'index.html'];

describe('Smoke Tests - Build Validation', function () {
  this.timeout(30000);

  it('should produce _site directory with expected structure', function () {
    expect(fs.existsSync(SITE)).to.be.true;
  });

  it('should generate index.html at root', function () {
    expect(fs.existsSync(sitePath('index.html'))).to.be.true;
  });

  it('should generate blog post HTML files', function () {
    expect(fs.existsSync(sitePath(...VIDEO_POST))).to.be.true;
  });

  it('should generate the stylesheet', function () {
    const css = read('index.css');
    expect(css).to.have.length.greaterThan(1000);
    expect(css).to.include(':root');
  });

  it('should render the video shortcode as a video inside its wrapper', function () {
    const $ = load(...VIDEO_POST);
    const wrapper = $('.video-wrapper');

    expect(wrapper, 'video wrapper element').to.have.lengthOf(1);
    expect(wrapper.find('video'), 'video inside the wrapper').to.have.lengthOf(1);
    expect(wrapper.find('video source').attr('src')).to.match(/^https?:\/\/.+\.mp4$/);
    expect(wrapper.find('video').attr('controls')).to.exist;
  });

  it('should style the video wrapper it renders', function () {
    // Ties the two together without hardcoding the class name in two places:
    // whatever class the shortcode emits must be addressed by the stylesheet.
    const $ = load(...VIDEO_POST);
    const wrapperClass = $('video').parent().attr('class');
    expect(wrapperClass, 'video is wrapped in a classed element').to.be.a('string');
    expect(read('index.css')).to.include(`.${wrapperClass}`);
  });

  it('should not contain raw shortcode syntax in HTML output', function () {
    const html = read(...VIDEO_POST);
    expect(html).to.not.include('{% video');
    expect(html).to.not.include('{% image');
  });

  it('should generate feed.xml for RSS', function () {
    expect(fs.existsSync(sitePath('feed.xml'))).to.be.true;
  });

  it('should render post images as figures with captions', function () {
    const $ = load(...VIDEO_POST);
    const figures = $('figure');
    expect(figures.length).to.be.greaterThan(0);

    figures.each((_, el) => {
      const $fig = $(el);
      expect($fig.find('picture source').length, 'one source per format').to.be.greaterThan(0);
      const img = $fig.find('img');
      expect(img.attr('src'), 'jpeg fallback').to.match(/\.jpeg$/);
      expect(img.attr('loading')).to.equal('lazy');
      // alt doubles as the visible caption
      expect($fig.find('figcaption').text()).to.equal(img.attr('alt'));
    });
  });
});

describe('Smoke Tests - Gig Post Type', function () {
  this.timeout(30000);

  it('should generate gigs index page', function () {
    expect(fs.existsSync(sitePath('gigs', 'index.html'))).to.be.true;
  });

  it('should generate gig post HTML', function () {
    expect(fs.existsSync(sitePath(...GIG_POST))).to.be.true;
  });

  it('should render the gig metadata card with its fields', function () {
    const $ = load(...GIG_POST);
    const card = $('.gig-metadata');

    expect(card, 'gig metadata card').to.have.lengthOf(1);

    const rows = card.find('tr');
    expect(rows.length, 'metadata rows').to.be.greaterThan(2);

    const labels = rows.map((_, tr) => $(tr).find('th').text().trim()).get();
    expect(labels).to.include.members(['Date', 'Venue']);

    expect(card.text()).to.contain('The Datsuns');
    expect(card.text()).to.contain('Underworld');
  });

  it('should style the gig metadata card it renders', function () {
    const $ = load(...GIG_POST);
    const cardClass = $('.gig-metadata').attr('class');
    expect(cardClass).to.be.a('string');
    expect(read('index.css')).to.include(`.${cardClass.split(/\s+/)[0]}`);
  });

  it('should render Flickr embed in gig post', function () {
    const $ = load(...GIG_POST);
    const embed = $('[data-flickr-embed="true"]');

    expect(embed, 'flickr embed anchor').to.have.lengthOf(1);
    expect(embed.attr('href')).to.contain('flickr.com');
    expect(embed.find('img').attr('src')).to.contain('live.staticflickr.com');
  });

  it('should list the gig post on the gigs index, linked to its own URL', function () {
    const $ = load('gigs', 'index.html');

    const section = $('.posts section').filter((_, s) =>
      $(s).find('.entry-title').text().includes('The Datsuns @ Underworld')
    );
    expect(section, 'gigs index section for the gig').to.have.lengthOf(1);

    expect(section.find('a').attr('href'))
      .to.equal('/posts/gigs/20090218-Datsuns-Astoria-London/');
  });

  it('should interleave gigs with posts on the home page', function () {
    // Deliberately not asserting a specific entry: the home page is capped at
    // 10, so naming one pins the test to publishing order. What matters is
    // that both content types reach the front page at all.
    const $ = load('index.html');

    const hrefs = $('.posts section')
      .map((_, s) => $(s).find('a').attr('href'))
      .get()
      .filter(Boolean);

    expect(hrefs.some((h) => h.startsWith('/posts/gigs/')), 'a gig on the home page').to.be.true;
    expect(
      hrefs.some((h) => h.startsWith('/posts/') && !h.startsWith('/posts/gigs/')),
      'a post on the home page'
    ).to.be.true;
  });

  it('should show a Gigs section with an All gigs link in the sidebar', function () {
    const $ = load('index.html');
    const gigsLink = $('a[href="/gigs/"]').filter((_, a) => /all gigs/i.test($(a).text()));
    expect(gigsLink, 'All gigs... link').to.have.lengthOf(1);
  });

  it('should include gig post in RSS feed', function () {
    const feed = read('feed.xml');
    const $ = cheerio.load(feed, { xmlMode: true });
    const titles = $('entry > title').map((_, t) => $(t).text()).get();
    expect(titles.join(' | ')).to.contain('The Datsuns @ Underworld');
  });

  it('should produce a well-formed feed with entries', function () {
    const $ = cheerio.load(read('feed.xml'), { xmlMode: true });
    expect($('feed').length, 'atom feed root').to.equal(1);
    expect($('entry').length, 'feed entries').to.be.greaterThan(5);
    $('entry').each((_, e) => {
      expect($(e).find('id').text()).to.match(/^https:\/\//);
    });
  });
});

describe('Smoke Tests - Structure and accessibility', function () {
  this.timeout(30000);

  const PAGES = [
    ['index.html'],
    ['posts', 'index.html'],
    ['gigs', 'index.html'],
    ['apps', 'index.html'],
    ['404.html'],
    ['posts', 'Last-Ever-Last-Ever', 'index.html'],
    ['posts', 'gigs', '20090218-Datsuns-Astoria-London', 'index.html']
  ];

  it('should provide landmarks on every page', function () {
    PAGES.forEach((p) => {
      const $ = load(...p);
      const where = p.join('/');
      expect($('main').length, `${where}: exactly one <main>`).to.equal(1);
      expect($('nav').length, `${where}: at least one <nav>`).to.be.greaterThan(0);
      expect($('footer').length, `${where}: a <footer>`).to.equal(1);
    });
  });

  it('should provide a skip link targeting main', function () {
    PAGES.forEach((p) => {
      const $ = load(...p);
      const skip = $('.skip-link');
      expect(skip.length, `${p.join('/')}: skip link`).to.equal(1);
      const target = skip.attr('href').replace('#', '');
      expect($(`#${target}`).length, `${p.join('/')}: skip target exists`).to.equal(1);
    });
  });

  it('should have exactly one h1 per page and never skip a heading level', function () {
    PAGES.forEach((p) => {
      const $ = load(...p);
      const where = p.join('/');

      expect($('h1').length, `${where}: exactly one <h1>`).to.equal(1);

      const levels = $('h1,h2,h3,h4,h5,h6')
        .map((_, h) => Number(h.tagName.slice(1)))
        .get();

      expect(levels[0], `${where}: first heading is the h1`).to.equal(1);
      levels.slice(1).forEach((lvl, i) => {
        expect(lvl - levels[i], `${where}: no level skipped at heading ${i + 2}`).to.be.at.most(1);
      });
    });
  });

  it('should label every nav landmark', function () {
    // Multiple navs on a page are ambiguous to a screen reader without names.
    PAGES.forEach((p) => {
      const $ = load(...p);
      $('nav').each((_, n) => {
        expect($(n).attr('aria-label'), `${p.join('/')}: nav has an accessible name`).to.be.a('string');
      });
    });
  });

  it('should allow pinch zoom', function () {
    // maximum-scale=1 blocks it, a WCAG 1.4.4 failure.
    const viewport = load('index.html')('meta[name="viewport"]').attr('content');
    expect(viewport).to.not.contain('maximum-scale');
    expect(viewport).to.contain('width=device-width');
  });

  it('should make the feed discoverable from the document head', function () {
    const link = load('index.html')('link[rel="alternate"][type="application/atom+xml"]');
    expect(link.length, 'feed autodiscovery link').to.equal(1);
    expect(link.attr('href')).to.contain('/feed.xml');
  });

  it('should expose the externals in both the sidebar and the footer', function () {
    const $ = load('index.html');

    // Sidebar copy — desktop. Footer copy — mobile, where the sidebar is hidden.
    const sidebar = $('.pure-menu-list a[href*="github.com"]');
    const footer = $('.site-footer-list a[href*="github.com"]');

    expect(sidebar.length, 'external in sidebar').to.equal(1);
    expect(footer.length, 'external in footer').to.equal(1);

    // Both render from site.externals, so the sets must match.
    const sidebarSet = $('.pure-menu-list a').map((_, a) => $(a).attr('href')).get()
      .filter((h) => /^https?:|feed\.xml/.test(h)).sort();
    const footerSet = $('.site-footer-list a').map((_, a) => $(a).attr('href')).get().sort();
    expect(footerSet).to.deep.equal(sidebarSet);
  });

  it('should give app pages a way back into the site', function () {
    const $ = load('ExifCmdLine', 'index.html');
    const navLinks = $('.app-nav-bar a, .app-nav a').map((_, a) => $(a).attr('href')).get();

    expect(navLinks, 'link home').to.include('/');
    expect(navLinks, 'link to apps index').to.include('/apps/');
    expect($('main').length, 'exactly one main').to.equal(1);
    expect($('footer').length, 'footer present').to.equal(1);
  });

  it('should load analytics exactly once per page', function () {
    // It used to be duplicated verbatim in the app layout.
    [['index.html'], ['ExifCmdLine', 'index.html']].forEach((p) => {
      const $ = load(...p);
      const snippets = $('script').filter((_, s) => /posthog\.init/.test($(s).html() || ''));
      expect(snippets.length, `${p.join('/')}: one analytics snippet`).to.equal(1);
    });
  });
});

describe('Smoke Tests - Bounded home page and feed', function () {
  this.timeout(30000);

  const HOME_LIMIT = 10;
  const FEED_LIMIT = 20;

  it(`should show at most ${HOME_LIMIT} entries on the home page`, function () {
    const $ = load('index.html');
    // Entries are the sections carrying a title; the archive-links section has none.
    const entries = $('.posts section').filter((_, s) => $(s).find('.entry-title').length > 0);
    expect(entries.length).to.be.at.most(HOME_LIMIT);
  });

  it('should link to the full archives from the home page', function () {
    const $ = load('index.html');
    const archive = $('.posts-archive-links');

    expect(archive, 'archive links section').to.have.lengthOf(1);
    expect(archive.find('a[href="/posts/"]').length, 'link to all posts').to.equal(1);
    expect(archive.find('a[href="/gigs/"]').length, 'link to all gigs').to.equal(1);
  });

  it('should state accurate totals in the archive links', function () {
    const $ = load('index.html');
    const $posts = load('posts', 'index.html');
    const $gigs = load('gigs', 'index.html');

    const text = $('.posts-archive-links').text();
    const postCount = $posts('.posts section .entry-title').length;
    const gigCount = $gigs('.posts section .entry-title').length;

    // Guards against the counts drifting from what the indexes actually list.
    expect(text).to.contain(`${postCount} posts`);
    expect(text).to.contain(`${gigCount} gigs`);
  });

  it(`should cap the feed at ${FEED_LIMIT} entries`, function () {
    const $ = cheerio.load(read('feed.xml'), { xmlMode: true });
    expect($('entry').length).to.be.at.most(FEED_LIMIT);
  });

  it('should keep everything reachable despite the caps', function () {
    // Nothing may fall off the site just because it fell off the front page.
    const $posts = load('posts', 'index.html');
    const $gigs = load('gigs', 'index.html');
    const $sitemap = cheerio.load(read('sitemap.xml'), { xmlMode: true });

    // Direct children only — anchors nested inside an excerpt belong to the
    // post's prose and can point anywhere, including off-site.
    const listed = $posts('.posts section > a').map((_, a) => $posts(a).attr('href')).get()
      .concat($gigs('.posts section > a').map((_, a) => $gigs(a).attr('href')).get());

    expect(listed.length, 'entries found across both indexes').to.be.greaterThan(15);

    const inSitemap = $sitemap('url > loc')
      .map((_, l) => $sitemap(l).text().replace('https://www.adrianparker.com', ''))
      .get();

    listed.forEach((href) => {
      expect(inSitemap, `${href} present in sitemap`).to.include(href);
    });
  });
});

describe('Smoke Tests - Apps', function () {
  this.timeout(30000);

  it('should generate an apps index listing each app', function () {
    expect(fs.existsSync(sitePath('apps', 'index.html')), '/apps/ page').to.be.true;

    const $ = load('apps', 'index.html');
    const sections = $('.posts section');
    expect(sections.length, 'app entries').to.be.greaterThan(0);

    sections.each((_, s) => {
      const $s = $(s);
      expect($s.find('.entry-title').text().trim(), 'app title').to.not.be.empty;
      expect($s.find('.blog-post-summary').text().trim(), 'app summary').to.not.be.empty;
      expect($s.find('a').attr('href'), 'link to the app').to.match(/^\//);
    });
  });

  it('should list the EXIF Viewer at its original URL', function () {
    const $ = load('apps', 'index.html');
    const link = $('.posts section a').filter((_, a) => $(a).attr('href') === '/ExifCmdLine/');
    expect(link.length, 'EXIF Viewer link').to.be.greaterThan(0);
    // The URL predates the collection; moving it would break inbound links.
    expect(fs.existsSync(sitePath('ExifCmdLine', 'index.html'))).to.be.true;
  });

  it('should embed the Gig Tracker from its source files', function () {
    const $ = load('Gig-History', 'index.html');
    const app = $('.gig-tracker');

    expect(app.length, 'app embedded once').to.equal(1);
    expect(app.find('table thead th').length, 'table headings').to.be.greaterThan(0);
    // The gig data is baked in at build time, not fetched at runtime.
    const script = app.find('script').html() || '';
    expect(script, 'gig data inlined').to.match(/GIGS\s*=\s*\[\s*\{/);
  });

  it('should not publish the Gig Tracker sources as pages of their own', function () {
    // Eleventy treats a stray .html or .md file as a template, which would put
    // orphaned, unstyled pages at their own URLs — see #45.
    expect(fs.existsSync(sitePath('GigTracker', 'gig-history')), 'orphaned app copy').to.be.false;
    expect(fs.existsSync(sitePath('GigTracker', 'README')), 'orphaned contract doc').to.be.false;
  });

  it('should make the Gig Tracker reload controls unreachable', function () {
    // They re-read a markdown file off disk that the site does not publish;
    // left live, a visitor clicking Reload lands in a file picker.
    const $ = load('Gig-History', 'index.html');
    ['#reload', '#file-input', '#reload-status'].forEach((selector) => {
      const control = $(selector);
      // Still in the DOM — the app's own script looks each one up on load,
      // and a missing element would throw and stop the table rendering.
      expect(control.length, `${selector} present`).to.equal(1);
      expect(control.closest('[hidden]').length, `${selector} hidden`).to.equal(1);
    });
  });

  it('should confine the embedded app stylesheet to the app', function () {
    const $ = load('Gig-History', 'index.html');
    const styles = $('head style').map((_, s) => $(s).html()).get().join('\n');
    expect(styles, 'inline app styles').to.not.be.empty;

    // Every selector must be scoped. An app shipping :root or body would
    // redefine the site's theme tokens or repaint the whole page.
    const selectors = styles
      .replace(/@[^{]+\{/g, '')
      .split('}')
      .map((rule) => rule.split('{')[0].trim())
      .filter(Boolean)
      .flatMap((list) => list.split(',').map((s) => s.trim()))
      .filter(Boolean);

    expect(selectors.length, 'rules found').to.be.greaterThan(0);
    selectors.forEach((selector) => {
      expect(selector, 'scoped to the app').to.match(/^\.gig-tracker\b/);
    });
  });

  it('should leave no unthemed colour in the embedded app stylesheet', function () {
    // A literal colour cannot follow the light/dark toggle. Everything has to
    // come through a token, either the app's own custom properties or ours.
    const $ = load('Gig-History', 'index.html');
    const styles = $('head style').map((_, s) => $(s).html()).get().join('\n');
    const literals = styles.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) || [];
    expect([...new Set(literals)], 'literal colours').to.deep.equal([]);
  });

  it('should drive the sidebar Apps section from the collection', function () {
    const $ = load('index.html');
    const appLinks = $('.pure-menu-list a[href="/ExifCmdLine/"]');
    expect(appLinks, 'app in sidebar').to.have.lengthOf(1);

    const allApps = $('.pure-menu-list a[href="/apps/"]').filter((_, a) =>
      /all apps/i.test($(a).text())
    );
    expect(allApps, 'All apps... link').to.have.lengthOf(1);
  });

  it('should include apps in the sitemap and the mobile menu', function () {
    const $sitemap = cheerio.load(read('sitemap.xml'), { xmlMode: true });
    const locs = $sitemap('url > loc').map((_, l) => $sitemap(l).text()).get();
    expect(locs).to.include('https://www.adrianparker.com/apps/');
    expect(locs).to.include('https://www.adrianparker.com/ExifCmdLine/');

    const $ = load('index.html');
    const mobile = $('.mobile-menu-list a').map((_, a) => $(a).attr('href')).get();
    expect(mobile, 'mobile menu links').to.include('/apps/');
  });
});

describe('Smoke Tests - Discoverability', function () {
  this.timeout(30000);

  it('should generate a 404 page with working navigation', function () {
    expect(fs.existsSync(sitePath('404.html')), '404.html at site root').to.be.true;

    const $ = load('404.html');
    // GitHub Pages serves this for any unmatched path, so it needs the full
    // site chrome, not a bare message.
    expect($('h1').first().text()).to.contain('not found');
    expect($('a[href="/"]').length, 'link home').to.be.greaterThan(0);
    expect($('a[href="/posts/"]').length, 'link to posts').to.be.greaterThan(0);
    expect($('a[href="/gigs/"]').length, 'link to gigs').to.be.greaterThan(0);
  });

  it('should generate robots.txt pointing at the sitemap', function () {
    const robots = read('robots.txt');
    expect(robots).to.contain('User-agent: *');
    expect(robots).to.contain('Sitemap: https://www.adrianparker.com/sitemap.xml');
  });

  it('should generate a sitemap listing every page', function () {
    const $ = cheerio.load(read('sitemap.xml'), { xmlMode: true });
    const locs = $('url > loc').map((_, l) => $(l).text()).get();

    expect(locs.length, 'sitemap entries').to.be.greaterThan(15);

    // Every URL absolute and on the canonical host
    locs.forEach((loc) => {
      expect(loc).to.match(/^https:\/\/www\.adrianparker\.com\//);
    });

    // The pages a reader would expect to find
    expect(locs).to.include('https://www.adrianparker.com/');
    expect(locs).to.include('https://www.adrianparker.com/posts/');
    expect(locs).to.include('https://www.adrianparker.com/gigs/');

    // Every lastmod is a bare date, not a timestamp — otherwise the file
    // churns on every rebuild
    $('url > lastmod').each((_, m) => {
      expect($(m).text()).to.match(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('should not list the feed, sitemap or 404 in the sitemap', function () {
    const $ = cheerio.load(read('sitemap.xml'), { xmlMode: true });
    const locs = $('url > loc').map((_, l) => $(l).text()).get().join(' ');
    expect(locs).to.not.contain('feed.xml');
    expect(locs).to.not.contain('sitemap.xml');
    expect(locs).to.not.contain('404');
  });

  it('should list every built page in the sitemap', function () {
    const $ = cheerio.load(read('sitemap.xml'), { xmlMode: true });
    const listed = new Set(
      $('url > loc').map((_, l) => $(l).text().replace('https://www.adrianparker.com', '')).get()
    );

    // Walk the built output and confirm nothing publishable is missing.
    const missing = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'dist') continue; // vendored artifact, see #45
          walk(full);
        } else if (entry.name === 'index.html') {
          const url = '/' + path.relative(SITE, path.dirname(full)).replace(/\\/g, '/');
          const normalised = url === '/.' ? '/' : url + '/';
          if (!listed.has(normalised === '//' ? '/' : normalised)) missing.push(normalised);
        }
      }
    };
    walk(SITE);

    expect(missing, `pages built but absent from sitemap:\n  ${missing.join('\n  ')}`).to.be.empty;
  });
});

describe('Smoke Tests - Internal links', function () {
  this.timeout(30000);

  /**
   * Every .html file the site authors, excluding _site/dist/ — that is a
   * vendored Vite build artifact passthrough-copied from static/, not
   * something this repo writes. Its own links are broken (it points at
   * /assets/... rather than /dist/assets/...), which is tracked in #45.
   */
  function allPages(dir = SITE, found = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'dist') continue;
        allPages(full, found);
      } else if (entry.name.endsWith('.html')) {
        found.push(full);
      }
    }
    return found;
  }

  /**
   * Resolves a site-absolute href to the file that should serve it.
   * Directory-style URLs (/posts/Foo/) map to their index.html.
   */
  function resolveTarget(href) {
    const clean = href.split('#')[0].split('?')[0];
    if (clean === '' || clean === '/') return path.join(SITE, 'index.html');
    const asFile = path.join(SITE, clean);
    if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return asFile;
    return path.join(asFile, 'index.html');
  }

  it('should not link to anything it did not build', function () {
    const pages = allPages();
    expect(pages.length, 'built pages').to.be.greaterThan(10);

    const broken = [];

    for (const page of pages) {
      const $ = cheerio.load(fs.readFileSync(page, 'utf8'));
      const from = path.relative(SITE, page);

      $('a[href], link[href], img[src], script[src], source[src]').each((_, el) => {
        const raw = $(el).attr('href') ?? $(el).attr('src');
        if (!raw) return;

        // Only site-absolute internal references. External, protocol-relative,
        // fragment-only, mailto: and data: are all out of scope here — external
        // link liveness is tracked separately in #45.
        if (!raw.startsWith('/') || raw.startsWith('//')) return;

        const target = resolveTarget(raw);
        if (!fs.existsSync(target)) {
          broken.push(`${from} -> ${raw}`);
        }
      });
    }

    expect(broken, `broken internal links:\n  ${broken.join('\n  ')}`).to.be.empty;
  });

  it('should have no internal link pointing outside _site', function () {
    const pages = allPages();
    const escaping = [];

    for (const page of pages) {
      const $ = cheerio.load(fs.readFileSync(page, 'utf8'));
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          const resolved = path.resolve(SITE, '.' + href);
          if (!resolved.startsWith(SITE)) escaping.push(`${path.relative(SITE, page)} -> ${href}`);
        }
      });
    }

    expect(escaping, `links escaping the site root:\n  ${escaping.join('\n  ')}`).to.be.empty;
  });
});
