import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PHOTO_SETS_DIR,
  PHOTOS_PREFIX,
  loadPhotoSet,
  findPhoto,
  photoUrl,
  photoVariants
} from "../../lib/photo-sets.mjs";

const MEDIA = "https://media.example.net";

describe("photo-sets — manifests", () => {
  let setsDir;

  before(() => {
    setsDir = fs.mkdtempSync(path.join(os.tmpdir(), "photo-sets-"));
    fs.writeFileSync(
      path.join(setsDir, "A-Set.json"),
      JSON.stringify({
        photos: [
          { name: "IMG_1", width: 800, height: 600 },
          { name: "IMG_2", width: 800, height: 1066, caption: "Hand-written" }
        ]
      })
    );
  });

  after(() => fs.rmSync(setsDir, { recursive: true, force: true }));

  it("keeps manifests under _data so `npm run serve` watches them", () => {
    expect(PHOTO_SETS_DIR).to.equal("content/_data/photoSets");
  });

  it("loads a set by id", () => {
    expect(loadPhotoSet("A-Set", setsDir).photos).to.have.lengthOf(2);
  });

  it("names the expected manifest path when a set is unknown", () => {
    expect(() => loadPhotoSet("Nope", setsDir)).to.throw(/Unknown photo set "Nope".*Nope\.json/);
  });

  it("finds a photo by name, including hand-edited fields", () => {
    expect(findPhoto("A-Set", "IMG_2", setsDir)).to.deep.equal({
      name: "IMG_2", width: 800, height: 1066, caption: "Hand-written"
    });
  });

  it("lists the set's names when a photo is unknown, to make the typo obvious", () => {
    expect(() => findPhoto("A-Set", "IMG_9", setsDir)).to.throw(/No photo "IMG_9" in set "A-Set".*IMG_1, IMG_2/);
  });
});

describe("photo-sets — URLs and variants", () => {
  it("builds the URL the publish script's filenames and prefix imply", () => {
    expect(PHOTOS_PREFIX).to.equal("photos");
    expect(photoUrl(MEDIA, "A-Set", "IMG_1", 400, "webp"))
      .to.equal("https://media.example.net/photos/A-Set/IMG_1-400.webp");
  });

  it("mirrors eleventy-img's metadata shape, smallest first, one entry per format", () => {
    const variants = photoVariants(MEDIA, "A-Set", { name: "IMG_1", width: 800, height: 600 }, [400, 800], ["webp", "jpeg"]);
    expect(Object.keys(variants)).to.deep.equal(["webp", "jpeg"]);
    expect(variants.jpeg.map((v) => v.width)).to.deep.equal([400, 800]);
    expect(variants.webp[0]).to.deep.equal({
      url: "https://media.example.net/photos/A-Set/IMG_1-400.webp",
      width: 400,
      height: 300,
      sourceType: "image/webp",
      srcset: "https://media.example.net/photos/A-Set/IMG_1-400.webp 400w"
    });
  });

  it("scales the smaller variants' heights from the largest, rounding", () => {
    const variants = photoVariants(MEDIA, "A-Set", { name: "IMG_2", width: 800, height: 1066 }, [400, 800], ["jpeg"]);
    expect(variants.jpeg[0].height).to.equal(533);
    expect(variants.jpeg[1].height).to.equal(1066);
  });
});
