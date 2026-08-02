/**
 * Smoke tests for the Eleventy build.
 *
 * These assert on the rendered DOM rather than on substrings of the built
 * CSS. The previous versions checked that _site/index.css contained the
 * literal text ".video-wrapper" and ".gig-metadata", which broke on any
 * CSS rename even when the site was perfectly correct, and passed happily
 * if the class was in the stylesheet but missing from the page.
 */

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

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

  it('should list the gig post on the home page, linked to its own URL', function () {
    const $ = load('index.html');

    const section = $('.posts section').filter((_, s) =>
      $(s).find('h1').text().includes('The Datsuns @ Underworld')
    );
    expect(section, 'home page section for the gig').to.have.lengthOf(1);

    expect(section.find('a').attr('href'))
      .to.equal('/posts/gigs/20090218-Datsuns-Astoria-London/');
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
