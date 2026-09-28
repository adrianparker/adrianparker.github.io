/*
  Scaffolds a new gig review post from content/GigTracker/gig-history.md.

    npm run new-gig -- <artist>
      Lists matching gig-history rows (date, show, venue, city, whether a
      review already exists).

    npm run new-gig -- <artist> <YYYY-MM-DD> [--summary '...'] [--photos]
      Writes content/posts/gigs/<stem>.md for the matching row on that date.
      --photos sets `photos: '<stem>'`, requiring a manifest already
      published at content/_data/photoSets/<stem>.json (npm run photos).

  See .claude/skills/new-gig/SKILL.md for the interactive flow this backs.
*/
import fs from "node:fs";
import path from "node:path";

import { parseGigHistory } from "../lib/gig-history.mjs";
import { parseGigReviews, findReviewUrl } from "../lib/gig-reviews.mjs";
import { findGigs, gigFrontMatter, gigStem, renderGigStub } from "../lib/gig-stub.mjs";
import { PHOTO_SETS_DIR } from "../lib/photo-sets.mjs";

const GIG_HISTORY_FILE = "content/GigTracker/gig-history.md";
const GIGS_DIR = "content/posts/gigs";

const args = process.argv.slice(2);
const summaryIndex = args.indexOf("--summary");
const summary = summaryIndex === -1 ? undefined : args[summaryIndex + 1];
const withPhotos = args.includes("--photos");
const positional = args.filter((arg, i) => arg !== "--photos" && i !== summaryIndex && i !== summaryIndex + 1);
const [artist, date] = positional;

if (!artist) {
  console.error("Usage: npm run new-gig -- <artist> [<YYYY-MM-DD>] [--summary '...'] [--photos]");
  process.exit(1);
}

const gigs = parseGigHistory(fs.readFileSync(GIG_HISTORY_FILE, "utf8"));
const matches = findGigs(gigs, artist);

if (matches.length === 0) {
  console.error(`No gig-history.md rows match "${artist}".`);
  process.exit(1);
}

function existingReviewDates() {
  const files = fs.readdirSync(GIGS_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({ name, content: fs.readFileSync(path.join(GIGS_DIR, name), "utf8") }));
  return parseGigReviews(files);
}

if (!date) {
  const reviews = existingReviewDates();
  console.log(`${matches.length} match(es) for "${artist}":`);
  for (const gig of matches) {
    const reviewed = findReviewUrl(reviews, gig.date) ? " (review exists)" : "";
    console.log(`  ${gig.date} — ${gig.performer} @ ${gig.venue}, ${gig.city}${reviewed}`);
  }
  process.exit(0);
}

const gig = matches.find((g) => g.date === date);
if (!gig) {
  console.error(`No match for "${artist}" on ${date}. Matching dates: ${matches.map((g) => g.date).join(", ")}`);
  process.exit(1);
}

const stem = gigStem(gig);
const filePath = path.join(GIGS_DIR, `${stem}.md`);

if (fs.existsSync(filePath)) {
  console.error(`${filePath} already exists.`);
  process.exit(1);
}

const reviews = existingReviewDates();
if (findReviewUrl(reviews, gig.date)) {
  console.error(`A gig post with date ${gig.date} already exists.`);
  process.exit(1);
}

if (withPhotos) {
  const manifestFile = path.join(PHOTO_SETS_DIR, `${stem}.json`);
  if (!fs.existsSync(manifestFile)) {
    console.error(`--photos given but no manifest at ${manifestFile}. Run: npm run photos -- ${stem} <folder> --upload`);
    process.exit(1);
  }
}

const frontMatter = gigFrontMatter(gig, { summary, photos: withPhotos ? stem : undefined });
fs.writeFileSync(filePath, renderGigStub(frontMatter));

console.log(`Wrote ${filePath}`);
console.log(`Stem: ${stem}`);
