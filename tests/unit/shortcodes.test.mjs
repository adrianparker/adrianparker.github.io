import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import {
  stringifyAttributes,
  videoShortcode,
  imageShortcode,
  photoShortcode,
  pictureHtml,
  pictureElement,
  IMAGE_WIDTHS,
  IMAGE_FORMATS,
  IMAGE_SIZES
} from "../../lib/shortcodes.mjs";

describe("shortcodes — stringifyAttributes", () => {
  it("renders attribute-value pairs", () => {
    expect(stringifyAttributes({ src: "/a.jpg", alt: "x" })).to.equal('src="/a.jpg" alt="x"');
  });

  it("omits undefined values, which is how optional attributes are dropped", () => {
    // poster and class both rely on this
    expect(stringifyAttributes({ controls: "controls", poster: undefined }).trim())
      .to.equal('controls="controls"');
  });

  it("keeps empty strings, which are meaningful for alt", () => {
    expect(stringifyAttributes({ alt: "" })).to.equal('alt=""');
  });

  it("returns an empty string for no attributes", () => {
    expect(stringifyAttributes({})).to.equal("");
  });
});

describe("shortcodes — videoShortcode", () => {
  it("wraps the video in the frame the stylesheet targets", () => {
    const out = videoShortcode("/video/clip.mp4");
    expect(out).to.match(/^<div class="video-wrapper-frame"><div class="video-wrapper">/);
    expect(out.trim()).to.match(/<\/div><\/div>$/);
  });

  it("defaults to mp4", () => {
    expect(videoShortcode("/video/clip.mp4")).to.contain('type="video/mp4"');
  });

  it("accepts an explicit type", () => {
    expect(videoShortcode("/v.webm", "video/webm")).to.contain('type="video/webm"');
  });

  it("omits poster entirely when not given", () => {
    expect(videoShortcode("/video/clip.mp4")).to.not.contain("poster");
  });

  it("also omits poster when given as an empty string", () => {
    // lets a call skip poster while still reaching the label argument
    expect(videoShortcode("/video/clip.mp4", "video/mp4", "")).to.not.contain("poster");
  });

  it("includes poster when given", () => {
    expect(videoShortcode("/v.mp4", "video/mp4", "/p.jpg")).to.contain('poster="/p.jpg"');
  });

  it("sets controls and lazy metadata preload", () => {
    const out = videoShortcode("/video/clip.mp4");
    expect(out).to.contain('controls="controls"');
    expect(out).to.contain('preload="metadata"');
  });

  it("includes fallback text for browsers without video support", () => {
    expect(videoShortcode("/video/clip.mp4")).to.contain("does not support the video tag");
  });

  it("omits the label badge entirely when no label is given", () => {
    expect(videoShortcode("/video/clip.mp4")).to.not.contain("video-label");
  });

  it("renders an icon and the label text when a label is given", () => {
    const out = videoShortcode("/video/clip.mp4", "video/mp4", "", "Full show highlights");
    expect(out).to.contain('<p class="video-label">');
    expect(out).to.contain('<span class="video-label-icon" aria-hidden="true"></span>');
    expect(out).to.contain("Full show highlights");
  });
});

describe("shortcodes — imageShortcode", () => {
  let tmpDir;
  let sourceImage;
  let html;

  before(async function () {
    this.timeout(30000);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "img-shortcode-"));
    sourceImage = path.join(tmpDir, "fixture.jpeg");

    // A tiny generated fixture keeps this fast; the real source photos are 1.7MB+
    await sharp({
      create: { width: 1000, height: 750, channels: 3, background: { r: 200, g: 120, b: 40 } }
    }).jpeg().toFile(sourceImage);

    html = await imageShortcode(
      sourceImage,
      "A test caption",
      undefined,
      IMAGE_WIDTHS,
      IMAGE_FORMATS,
      "(max-width: 768px) 400px, 800px",
      path.join(tmpDir, "out") + path.sep
    );
  });

  after(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("wraps everything in a figure", () => {
    expect(html).to.match(/^<figure><picture/);
    expect(html.trim()).to.match(/<\/figure>$/);
  });

  it("emits one source per format", () => {
    const sources = html.match(/<source /g) ?? [];
    expect(sources).to.have.lengthOf(IMAGE_FORMATS.length);
    expect(html).to.contain('type="image/webp"');
    expect(html).to.contain('type="image/jpeg"');
  });

  it("falls back to jpeg in the img tag, not webp", () => {
    const img = html.match(/<img [^>]*>/)[0];
    expect(img).to.contain(".jpeg");
    expect(img).to.not.contain(".webp");
  });

  it("uses the largest width for the img fallback", () => {
    const img = html.match(/<img [^>]*>/)[0];
    expect(img).to.contain(`-${Math.max(...IMAGE_WIDTHS)}.jpeg`);
  });

  it("renders the alt text as the visible caption as well", () => {
    expect(html).to.contain("<figcaption>A test caption</figcaption>");
    expect(html).to.contain('alt="A test caption"');
  });

  it("sets width and height on the img fallback to prevent layout shift", () => {
    const img = html.match(/<img [^>]*>/)[0];
    const maxWidth = Math.max(...IMAGE_WIDTHS);
    // fixture is a 4:3 image (1000x750), so height should scale proportionally
    expect(img).to.contain(`width="${maxWidth}"`);
    expect(img).to.contain(`height="${Math.round((maxWidth * 750) / 1000)}"`);
  });

  it("sets lazy loading and async decoding", () => {
    expect(html).to.contain('loading="lazy"');
    expect(html).to.contain('decoding="async"');
  });

  it("passes the sizes attribute through to each source", () => {
    expect(html).to.contain('sizes="(max-width: 768px) 400px, 800px"');
  });

  it("defaults to IMAGE_SIZES, matching static/index.css's own breakpoint", async () => {
    expect(IMAGE_SIZES).to.equal("(max-width: 47.999em) 100vw, 68vw");

    const defaultSizesHtml = await imageShortcode(
      sourceImage,
      "A test caption",
      undefined,
      IMAGE_WIDTHS,
      IMAGE_FORMATS,
      undefined,
      path.join(tmpDir, "out-default-sizes") + path.sep
    );

    expect(defaultSizesHtml).to.contain(`sizes="${IMAGE_SIZES}"`);
  });

  it("actually writes the resized files", () => {
    const written = fs.readdirSync(path.join(tmpDir, "out"));
    // 2 widths x 2 formats
    expect(written).to.have.lengthOf(IMAGE_WIDTHS.length * IMAGE_FORMATS.length);
  });
});

describe("shortcodes — photoShortcode", () => {
  const MEDIA = "https://media.example.net";
  let setsDir;
  let html;

  before(() => {
    setsDir = fs.mkdtempSync(path.join(os.tmpdir(), "photo-shortcode-"));
    fs.writeFileSync(
      path.join(setsDir, "My-Post.json"),
      JSON.stringify({ photos: [{ name: "IMG_1", width: 800, height: 600 }] })
    );
    html = photoShortcode(MEDIA, "My-Post/IMG_1", "A remote caption", undefined, setsDir);
  });

  after(() => fs.rmSync(setsDir, { recursive: true, force: true }));

  it("renders the same figure/picture/figcaption structure as imageShortcode", () => {
    expect(html).to.match(/^<figure><picture/);
    expect(html.trim()).to.match(/<\/figure>$/);
    expect(html.match(/<source /g)).to.have.lengthOf(IMAGE_FORMATS.length);
    expect(html).to.contain("<figcaption>A remote caption</figcaption>");
    expect(html).to.contain('alt="A remote caption"');
    expect(html).to.contain('loading="lazy"');
    expect(html).to.contain(`sizes="${IMAGE_SIZES}"`);
  });

  it("points every URL at the media host under the set's prefix", () => {
    expect(html).to.contain(
      `srcset="${MEDIA}/photos/My-Post/IMG_1-400.webp 400w, ${MEDIA}/photos/My-Post/IMG_1-800.webp 800w"`
    );
    const img = html.match(/<img [^>]*>/)[0];
    expect(img).to.contain(`src="${MEDIA}/photos/My-Post/IMG_1-800.jpeg"`);
    expect(img).to.contain('width="800"');
    expect(img).to.contain('height="600"');
    expect(html).to.not.contain("/img/");
  });

  it("passes the class through to the picture element", () => {
    const withClass = photoShortcode(MEDIA, "My-Post/IMG_1", "x", "hero", setsDir);
    expect(withClass).to.contain('<picture class="hero">');
  });

  it("rejects a reference that is not <set-id>/<name>", () => {
    for (const bad of ["IMG_1", "/IMG_1", "My-Post/"]) {
      expect(() => photoShortcode(MEDIA, bad, "x", undefined, setsDir), bad)
        .to.throw(/must be "<set-id>\/<name>"/);
    }
  });

  it("fails the build on an unknown set or photo rather than shipping a broken image", () => {
    expect(() => photoShortcode(MEDIA, "Nope/IMG_1", "x", undefined, setsDir)).to.throw(/Unknown photo set/);
    expect(() => photoShortcode(MEDIA, "My-Post/IMG_9", "x", undefined, setsDir)).to.throw(/No photo "IMG_9"/);
  });
});

describe("shortcodes — pictureHtml", () => {
  const metadata = {
    jpeg: [
      { url: "/a-400.jpeg", width: 400, height: 300, sourceType: "image/jpeg", srcset: "/a-400.jpeg 400w" },
      { url: "/a-800.jpeg", width: 800, height: 600, sourceType: "image/jpeg", srcset: "/a-800.jpeg 800w" }
    ]
  };

  it("omits the class attribute when none is given", () => {
    expect(pictureHtml(metadata, "x")).to.contain("<picture >");
  });

  it("uses the sizes it is given", () => {
    expect(pictureHtml(metadata, "x", undefined, "100vw")).to.contain('sizes="100vw"');
  });

  it("is pictureElement wrapped in a captioned figure", () => {
    const picture = pictureElement(metadata, "x");
    expect(pictureHtml(metadata, "x")).to.equal(`<figure>${picture}<figcaption>x</figcaption></figure>`);
    expect(picture).to.match(/^<picture /);
    expect(picture.trim()).to.match(/<\/picture>$/);
  });

  it("lets pictureElement override the lazy default, which the slideshow's first slide needs", () => {
    expect(pictureElement(metadata, "x")).to.contain('loading="lazy"');
    expect(pictureElement(metadata, "x", undefined, undefined, "eager")).to.contain('loading="eager"');
  });
});
