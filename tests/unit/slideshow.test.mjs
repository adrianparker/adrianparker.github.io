import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { slideshowShortcode, escapeHtml, SLIDESHOW_SCRIPT } from "../../lib/slideshow.mjs";

const MEDIA = "https://media.example.net";

describe("slideshow — escapeHtml", () => {
  it("escapes the characters that would break an attribute or inject markup", () => {
    expect(escapeHtml(`Teen Jesus & the <Jean> "Teasers"`)).to.equal("Teen Jesus &amp; the &lt;Jean&gt; &quot;Teasers&quot;");
  });

  it("leaves plain text alone", () => {
    expect(escapeHtml("Datsuns @ Underworld, London")).to.equal("Datsuns @ Underworld, London");
  });
});

describe("slideshow — slideshowShortcode", () => {
  let setsDir;
  let html;

  before(() => {
    setsDir = fs.mkdtempSync(path.join(os.tmpdir(), "slideshow-"));
    fs.writeFileSync(
      path.join(setsDir, "A-Gig.json"),
      JSON.stringify({
        photos: [
          { name: "IMG_1", width: 800, height: 600 },
          { name: "IMG_2", width: 800, height: 1066, caption: "Support act & friends" },
          { name: "IMG_3", width: 800, height: 600 }
        ]
      })
    );
    fs.writeFileSync(path.join(setsDir, "Empty.json"), JSON.stringify({ photos: [] }));
    html = slideshowShortcode(MEDIA, "A-Gig", "Band & Co @ Venue", setsDir);
  });

  after(() => fs.rmSync(setsDir, { recursive: true, force: true }));

  it("wraps everything in the slideshow root the script looks for", () => {
    expect(html).to.match(/^<div class="slideshow" data-slideshow>/);
    expect(html).to.contain('<div class="slideshow-frame">');
  });

  it("renders one figure per photo, numbered for assistive tech", () => {
    const slides = html.match(/<figure class="slideshow-slide"/g);
    expect(slides).to.have.lengthOf(3);
    expect(html).to.contain('aria-label="Photo 1 of 3"');
    expect(html).to.contain('aria-label="Photo 3 of 3"');
  });

  it("uses the responsive picture markup with every URL on the media host", () => {
    expect(html.match(/<picture /g)).to.have.lengthOf(3);
    expect(html.match(/<source /g)).to.have.lengthOf(6);
    expect(html).to.contain(`src="${MEDIA}/photos/A-Gig/IMG_1-800.jpeg"`);
    expect(html).to.contain(`${MEDIA}/photos/A-Gig/IMG_2-400.webp 400w`);
  });

  it("loads the first photo eagerly and the rest lazily", () => {
    const loadings = [...html.matchAll(/loading="(\w+)"/g)].map((m) => m[1]);
    expect(loadings).to.deep.equal(["eager", "lazy", "lazy"]);
  });

  it("makes the strip keyboard-focusable and names it after the set", () => {
    expect(html).to.contain('<div class="slideshow-track" tabindex="0" aria-label="Photos: Band &amp; Co @ Venue">');
  });

  it("falls back to a positional alt when a photo has no caption", () => {
    expect(html).to.contain('alt="Band &amp; Co @ Venue, photo 1 of 3"');
    expect(html).to.contain('alt="Band &amp; Co @ Venue, photo 3 of 3"');
  });

  it("uses a caption as both alt text and a visible figcaption, escaped", () => {
    expect(html).to.contain('alt="Support act &amp; friends"');
    expect(html).to.contain('<figcaption class="slideshow-caption">Support act &amp; friends</figcaption>');
    expect(html.match(/<figcaption/g)).to.have.lengthOf(1);
  });

  it("renders prev/next buttons and a photo count the script can take over", () => {
    expect(html).to.contain('<button type="button" class="slideshow-prev" aria-label="Previous photo">');
    expect(html).to.contain('<button type="button" class="slideshow-next" aria-label="Next photo">');
    expect(html).to.contain('<p class="slideshow-status" aria-live="polite">3 photos</p>');
  });

  it("loads the enhancement script from this origin, deferred", () => {
    expect(SLIDESHOW_SCRIPT).to.equal("/slideshow.js");
    expect(html.trim()).to.match(/<script src="\/slideshow\.js" defer><\/script>$/);
  });

  it("fails the build on an unknown set", () => {
    expect(() => slideshowShortcode(MEDIA, "Nope", "x", setsDir)).to.throw(/Unknown photo set "Nope"/);
  });

  it("fails the build on an empty set rather than rendering an empty frame", () => {
    expect(() => slideshowShortcode(MEDIA, "Empty", "x", setsDir)).to.throw(/"Empty" is empty/);
  });
});
