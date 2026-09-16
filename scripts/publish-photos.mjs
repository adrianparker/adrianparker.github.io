/*
  Publishes a folder of photos as a named set: resizes them into the site's
  variants, writes the set manifest the shortcodes read, and (with --upload)
  syncs the variants to the media bucket.

    npm run photos -- <set-id> <source-dir> [--upload]

  Set id convention is the post or gig file stem, e.g.
  20260523-Teen-Jesus-and-the-Jean-Teasers. Only the AWS CLI ever touches
  credentials, via the named profile below; this script never sees them.
  See README.md → Photos.
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { buildPhotoSet } from "../lib/photo-publish.mjs";
import { PHOTO_SETS_DIR, PHOTOS_PREFIX } from "../lib/photo-sets.mjs";

const BUCKET = "adrianparkervideo";
const PROFILE = "blog-photos";
const OUT_ROOT = ".photos";

const args = process.argv.slice(2);
const upload = args.includes("--upload");
const [setId, sourceDir] = args.filter((arg) => arg !== "--upload");

if (!setId || !sourceDir) {
  console.error("Usage: npm run photos -- <set-id> <source-dir> [--upload]");
  process.exit(1);
}

const manifestFile = path.join(PHOTO_SETS_DIR, `${setId}.json`);
const outDir = path.join(OUT_ROOT, setId) + path.sep;
const existing = fs.existsSync(manifestFile)
  ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
  : undefined;

const manifest = await buildPhotoSet(sourceDir, outDir, existing);

fs.mkdirSync(PHOTO_SETS_DIR, { recursive: true });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${manifest.photos.length} photos → ${outDir}, manifest ${manifestFile}`);

const sync = [
  "s3", "sync", outDir, `s3://${BUCKET}/${PHOTOS_PREFIX}/${setId}/`,
  "--cache-control", "public, max-age=31536000, immutable",
  "--profile", PROFILE
];

if (upload) {
  const result = spawnSync("aws", sync, { stdio: "inherit" });
  process.exit(result.status ?? 1);
} else {
  const quoted = sync.map((arg) => (arg.includes(" ") ? `"${arg}"` : arg)).join(" ");
  console.log(`Dry run. To upload:\n  aws ${quoted}`);
}
