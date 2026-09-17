import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import {
  PHOTO_EXTENSIONS,
  listSourcePhotos,
  photoName,
  variantFilename,
  buildPhotoSet
} from "../../lib/photo-publish.mjs";
import { photoUrl } from "../../lib/photo-sets.mjs";

// Tiny generated fixtures keep this fast; the real source photos are 1.7MB+.
async function writeJpeg(file, width, height, options = {}) {
  await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    .jpeg()
    .withMetadata(options)
    .toFile(file);
}

describe("photo-publish — source discovery", () => {
  let dir;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "photo-src-"));
    for (const f of ["b.JPG", "a.jpeg", "c.png", "notes.txt", ".DS_Store", "d.heic"]) {
      fs.writeFileSync(path.join(dir, f), "");
    }
  });

  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("picks up jpeg and png regardless of extension case, sorted by name", () => {
    expect(PHOTO_EXTENSIONS).to.deep.equal([".jpg", ".jpeg", ".png"]);
    expect(listSourcePhotos(dir)).to.deep.equal(["a.jpeg", "b.JPG", "c.png"]);
  });

  it("derives the published name from the file name without its extension", () => {
    expect(photoName("IMG_1401.jpeg")).to.equal("IMG_1401");
  });

  it("names variants the way photoUrl() expects to find them", () => {
    const url = photoUrl("https://m.example", "S", "IMG_1", 400, "webp");
    expect(url.endsWith("/" + variantFilename("IMG_1", 400, "webp"))).to.equal(true);
  });
});

describe("photo-publish — buildPhotoSet", () => {
  let dir;
  let src;
  let out;
  let manifest;

  before(async function () {
    this.timeout(30000);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "photo-build-"));
    src = path.join(dir, "src");
    out = path.join(dir, "out") + path.sep;
    fs.mkdirSync(src);
    await writeJpeg(path.join(src, "IMG_2.jpeg"), 1000, 750);
    // EXIF orientation 6 = rotate 90° clockwise, so this lands as 900×1200 portrait
    await writeJpeg(path.join(src, "IMG_1.jpeg"), 1200, 900, { orientation: 6 });

    manifest = await buildPhotoSet(src, out, undefined, [400, 800], ["webp", "jpeg"]);
  });

  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("writes every width × format variant under the predictable filenames", () => {
    expect(fs.readdirSync(out).sort()).to.deep.equal([
      "IMG_1-400.jpeg", "IMG_1-400.webp", "IMG_1-800.jpeg", "IMG_1-800.webp",
      "IMG_2-400.jpeg", "IMG_2-400.webp", "IMG_2-800.jpeg", "IMG_2-800.webp"
    ]);
  });

  it("records the largest variant's dimensions in filename order", () => {
    expect(manifest.photos.map((p) => p.name)).to.deep.equal(["IMG_1", "IMG_2"]);
    expect(manifest.photos[1]).to.deep.equal({ name: "IMG_2", width: 800, height: 600 });
  });

  it("bakes EXIF orientation into the output rather than carrying it as metadata", async () => {
    expect(manifest.photos[0]).to.deep.equal({ name: "IMG_1", width: 800, height: 1066 });
    const meta = await sharp(path.join(out, "IMG_1-800.jpeg")).metadata();
    expect(meta.width).to.equal(800);
    expect(meta.height).to.equal(1067);
    expect(meta.orientation).to.equal(undefined);
  });

  it("strips the rest of the EXIF too", async () => {
    const meta = await sharp(path.join(out, "IMG_2-800.jpeg")).metadata();
    expect(meta.exif).to.equal(undefined);
  });

  it("keeps hand-edited manifest fields for photos that are still present", async function () {
    this.timeout(30000);
    const existing = {
      photos: [
        { name: "IMG_2", width: 1, height: 1, caption: "Kept" },
        { name: "IMG_gone", width: 1, height: 1, caption: "Dropped with its photo" }
      ]
    };
    const rebuilt = await buildPhotoSet(src, out, existing, [400, 800], ["webp", "jpeg"]);
    expect(rebuilt.photos).to.deep.equal([
      { name: "IMG_1", width: 800, height: 1066 },
      { name: "IMG_2", width: 800, height: 600, caption: "Kept" }
    ]);
  });

  it("refuses an empty folder", async () => {
    const empty = path.join(dir, "empty");
    fs.mkdirSync(empty);
    let error;
    await buildPhotoSet(empty, out).catch((e) => { error = e; });
    expect(error.message).to.match(/No photos/);
  });

  it("refuses two sources that would publish under the same name", async () => {
    const dupes = path.join(dir, "dupes");
    fs.mkdirSync(dupes);
    await writeJpeg(path.join(dupes, "IMG_1.jpg"), 1000, 750);
    await writeJpeg(path.join(dupes, "IMG_1.jpeg"), 1000, 750);
    let error;
    await buildPhotoSet(dupes, out).catch((e) => { error = e; });
    expect(error.message).to.match(/both be published as "IMG_1"/);
  });

  it("keeps a source narrower than the largest width at native size, under the largest width's name", async function () {
    this.timeout(30000);
    const small = path.join(dir, "small");
    const smallOut = path.join(dir, "small-out") + path.sep;
    fs.mkdirSync(small);
    await writeJpeg(path.join(small, "old-phone.jpeg"), 640, 480);
    const manifest = await buildPhotoSet(small, smallOut, undefined, [400, 800], ["webp", "jpeg"]);

    // URLs the shortcode builds still resolve...
    expect(fs.readdirSync(smallOut).sort()).to.deep.equal([
      "old-phone-400.jpeg", "old-phone-400.webp", "old-phone-800.jpeg", "old-phone-800.webp"
    ]);
    // ...and the manifest says how big the "800" really is
    expect(manifest.photos).to.deep.equal([{ name: "old-phone", width: 640, height: 480 }]);
    const meta = await sharp(path.join(smallOut, "old-phone-800.jpeg")).metadata();
    expect(meta.width).to.equal(640);
  });

  it("refuses a source narrower than the smallest width, whose URL could not be honoured", async function () {
    this.timeout(30000);
    const tiny = path.join(dir, "tiny");
    fs.mkdirSync(tiny);
    await writeJpeg(path.join(tiny, "tiny.jpeg"), 320, 240);
    let error;
    await buildPhotoSet(tiny, path.join(dir, "tiny-out") + path.sep, undefined, [400, 800], ["jpeg"]).catch((e) => { error = e; });
    expect(error.message).to.match(/tiny\.jpeg is only 320px wide; sources must be at least 400px/);
  });
});
