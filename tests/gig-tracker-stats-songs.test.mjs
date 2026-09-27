/**
 * Behavioural test for the "Songs heard live" statistics card (#187): a
 * table of every song from a single filtered performer's visible gigs'
 * setlists, with how many of those gigs included it. Only shown once the
 * Show filter is narrowed to a single performer, and hidden entirely (no
 * placeholder text) when that performer has no setlist songs to show.
 */

import { expect } from 'chai';
import { chromium } from 'playwright';
import { startServer, stopServer } from './utils/http-server.mjs';

const PORT = 3011;
const BASE = `http://localhost:${PORT}`;

describe('Gig Tracker "Songs heard live" statistics card', function () {
  this.timeout(60000);

  let browser;
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
    page = await browser.newPage();
    await page.goto(`${BASE}/Gig-History/index.html`, { waitUntil: 'networkidle' });
    await page.click('#stats-toggle');
    await page.waitForSelector('#stats-panel.stats-panel--open');
  });

  afterEach(async function () {
    if (page) await page.close();
  });

  it('is hidden while no single performer is selected', async function () {
    expect(await page.getAttribute('#stats-songs', 'hidden')).to.not.equal(null);
  });

  it('lists songs and counts for a performer with setlist data, sorted by count then title', async function () {
    await page.selectOption('#f-performer', 'Shihad');
    await page.waitForSelector('#stats-songs:not([hidden])');

    const title = await page.textContent('#stats-songs-title');
    expect(title).to.equal('Songs heard live — Shihad');

    const rows = await page.$$eval('#stats-songs-tbody tr', (trs) =>
      trs.map((tr) => {
        const cells = tr.querySelectorAll('td');
        return { song: cells[0].textContent, count: Number(cells[1].textContent) };
      })
    );

    expect(rows.length).to.be.greaterThan(0);
    // Sorted by count descending, then title ascending (case-insensitive).
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      if (prev.count === cur.count) {
        expect(prev.song.toLowerCase() <= cur.song.toLowerCase()).to.equal(true);
      } else {
        expect(prev.count).to.be.greaterThan(cur.count);
      }
    }

    // "You Again" and "Home Again" are two of the songs played across most
    // of Shihad's setlisted shows in gig-history.md, so the top row should
    // be one of the two.
    expect(['You Again', 'Home Again']).to.include(rows[0].song);
  });

  it('is hidden with no placeholder text when the selected performer has no setlist songs', async function () {
    // Werewolf (Theatre) has no Setlist.fm ID at all, so it can never have
    // setlist songs.
    await page.selectOption('#f-performer', 'Werewolf');
    await page.waitForSelector('#stats-performers-title:has-text("Werewolf")');

    expect(await page.getAttribute('#stats-songs', 'hidden')).to.not.equal(null);
    expect(await page.textContent('#stats-panel')).to.not.include('No song');
  });

  it('hides again once the performer filter is cleared', async function () {
    await page.selectOption('#f-performer', 'Shihad');
    await page.waitForSelector('#stats-songs:not([hidden])');

    await page.click('#reset');
    await page.waitForFunction(() => document.getElementById('stats-songs').hidden === true);
  });
});
