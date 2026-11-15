import { expect } from "chai";
import { splitNames, slugify, performersOf, buildHubs, hubFor, HUB_MIN_REVIEWS } from "../../lib/hubs.mjs";

const gig = (url, date, data = {}) => ({ url, date: new Date(date), data: { tags: ["gig"], ...data } });

describe("hubs — splitNames", () => {
  it("splits on commas, trims, and honours the \\, escape", () => {
    expect(splitNames("A, B ,Does It Offend You\\, Yeah?")).to.deep.equal(["A", "B", "Does It Offend You, Yeah?"]);
  });

  it("flattens arrays and drops blanks and non-strings", () => {
    expect(splitNames(["A, B", undefined, "", "C"])).to.deep.equal(["A", "B", "C"]);
  });
});

describe("hubs — slugify", () => {
  it("makes lower-case hyphenated slugs", () => {
    expect(slugify("The Datsuns")).to.equal("the-datsuns");
    expect(slugify("Teen Jesus & the Jean Teasers")).to.equal("teen-jesus-and-the-jean-teasers");
    expect(slugify("Shepherd's Bush Empire")).to.equal("shepherds-bush-empire");
    expect(slugify("W.A.S.P.")).to.equal("w-a-s-p");
    expect(slugify("Motörhead")).to.equal("motorhead");
  });
});

describe("hubs — performersOf", () => {
  it("lists the headliner and every support act, split", () => {
    expect(performersOf({ headlineArtist: "A", supportArtists: ["B, C"] })).to.deep.equal(["A", "B", "C"]);
    expect(performersOf({ headlineArtist: "A" })).to.deep.equal(["A"]);
  });
});

describe("hubs — buildHubs", () => {
  const gigs = [
    gig("/g/b/", "2026-03-20", { headlineArtist: "The Datsuns", supportArtists: ["Warm Leather"], venue: "San Fran" }),
    gig("/g/a/", "2009-02-18", { headlineArtist: "the datsuns", venue: "Underworld" }),
    gig("/g/c/", "2026-05-23", { headlineArtist: "Teen Jesus", venue: "San Fran" })
  ];
  const rows = [
    { date: "2009-02-18", performer: "The Datsuns", association: "", venue: "Underworld" },
    { date: "2026-03-20", performer: "The Datsuns, Warm Leather", association: "", venue: "San Fran" },
    { date: "2004-01-01", performer: "Someone", association: "The Datsuns", venue: "San Fran" },
    { date: "2015-01-01", performer: "Other", association: "", venue: "Elsewhere" }
  ];

  it("builds a performer hub only for acts with enough reviews", () => {
    const hubs = buildHubs(gigs, rows, "performer");
    expect(hubs.map((h) => h.name)).to.deep.equal(["the datsuns"]);
    expect(HUB_MIN_REVIEWS).to.equal(2);
  });

  it("lists reviews oldest first and Gig History rows newest first, matching Show and Association", () => {
    const [hub] = buildHubs(gigs, rows, "performer");
    expect(hub.slug).to.equal("the-datsuns");
    expect(hub.kind).to.equal("performer");
    expect(hub.reviews.map((r) => r.url)).to.deep.equal(["/g/a/", "/g/b/"]);
    expect(hub.rows.map((r) => r.date)).to.deep.equal(["2026-03-20", "2009-02-18", "2004-01-01"]);
  });

  it("builds venue hubs from the Venue column", () => {
    const [hub] = buildHubs(gigs, rows, "venue");
    expect(hub.name).to.equal("San Fran");
    expect(hub.reviews.map((r) => r.url)).to.deep.equal(["/g/b/", "/g/c/"]);
    expect(hub.rows.map((r) => r.date)).to.deep.equal(["2026-03-20", "2004-01-01"]);
  });

  it("sorts hubs by name", () => {
    const more = [...gigs, gig("/g/d/", "2025-01-01", { headlineArtist: "ABBA", venue: "X" }), gig("/g/e/", "2025-02-01", { headlineArtist: "ABBA", venue: "Y" })];
    expect(buildHubs(more, [], "performer").map((h) => h.name)).to.deep.equal(["ABBA", "the datsuns"]);
  });
});

describe("hubs — hubFor", () => {
  const hubs = [{ name: "The Datsuns" }];

  it("finds a hub case-insensitively", () => {
    expect(hubFor(hubs, "the DATSUNS")).to.equal(hubs[0]);
  });

  it("returns undefined for no match or no name", () => {
    expect(hubFor(hubs, "Mudhoney")).to.be.undefined;
    expect(hubFor(hubs, undefined)).to.be.undefined;
  });
});
