import { expect } from "chai";
import matter from "gray-matter";
import {
  splitPerformers,
  findGigs,
  gigFrontMatter,
  gigStem,
  parseNewGigArgs,
  renderGigStub
} from "../../lib/gig-stub.mjs";

const BEASTWARS = {
  date: "2025-11-22",
  performer: "Beastwars, Soft Bait, Pull Down The Sun",
  category: "Music",
  city: "Wellington",
  country: "New Zealand",
  venue: "Meow Nui",
  show: "",
  association: "",
  setlistfmId: "Beastwars:734cb29d, Soft Bait:634cae87:empty, Pull Down The Sun:734cae81"
};

const TEEN_JESUS = {
  date: "2026-05-23",
  performer: "Teen Jesus & the Jean Teasers, Ivy",
  category: "Music",
  city: "Wellington",
  country: "New Zealand",
  venue: "San Fran",
  show: "",
  association: "",
  setlistfmId: ""
};

const SOLO_NO_NOTES = {
  date: "2013-05-04",
  performer: "Unida, Beastwars",
  category: "Music",
  city: "Wellington",
  country: "New Zealand",
  venue: "Bar Bodega",
  show: "",
  association: "",
  setlistfmId: "Unida:73c2cef5"
};

const SOLO_NO_EXTRAS = {
  date: "2014-10-10",
  performer: "Beastwars",
  category: "Music",
  city: "Wellington",
  country: "New Zealand",
  venue: "San Fran",
  show: "",
  association: "",
  setlistfmId: ""
};

const WITH_NOTES = {
  date: "2020-03-07",
  performer: "Beastwars, Uncle Acid and the Deadbeats",
  category: "Music",
  city: "Upper Hutt",
  country: "New Zealand",
  venue: "Panhead Brewery",
  show: "Obey the Riff",
  association: "",
  setlistfmId: ""
};

describe("gig-stub — splitPerformers", () => {
  it("splits a comma-separated list", () => {
    expect(splitPerformers("Beastwars, Soft Bait")).to.deep.equal(["Beastwars", "Soft Bait"]);
  });

  it("unescapes a literal comma in a name", () => {
    expect(splitPerformers("Does It Offend You\\, Yeah?, Support")).to.deep.equal([
      "Does It Offend You, Yeah?",
      "Support"
    ]);
  });

  it("returns an empty array for a blank value", () => {
    expect(splitPerformers("")).to.deep.equal([]);
  });

  it("returns an empty array for an undefined value", () => {
    expect(splitPerformers(undefined)).to.deep.equal([]);
  });
});

describe("gig-stub — findGigs", () => {
  const gigs = [TEEN_JESUS, BEASTWARS, SOLO_NO_NOTES];

  it("matches any performer, case-insensitively", () => {
    const matches = findGigs(gigs, "beastwars");
    expect(matches).to.have.lengthOf(2);
  });

  it("matches a support artist too", () => {
    expect(findGigs(gigs, "Ivy")).to.deep.equal([TEEN_JESUS]);
  });

  it("returns newest first", () => {
    const matches = findGigs(gigs, "beastwars");
    expect(matches[0].date).to.equal("2025-11-22");
    expect(matches[1].date).to.equal("2013-05-04");
  });

  it("returns an empty array when nothing matches", () => {
    expect(findGigs(gigs, "Nobody")).to.deep.equal([]);
  });

  it("keeps stable order for two gigs on the same date", () => {
    const sameDateA = { ...BEASTWARS, venue: "Venue A" };
    const sameDateB = { ...BEASTWARS, venue: "Venue B" };
    expect(findGigs([sameDateA, sameDateB], "beastwars")).to.deep.equal([sameDateA, sameDateB]);
  });
});

describe("gig-stub — gigFrontMatter", () => {
  it("builds the expected fields for a gig with support artists and setlist ids", () => {
    const fm = gigFrontMatter(BEASTWARS, { summary: "Riffs for days" });
    expect(fm).to.deep.equal({
      title: "Beastwars @ Meow Nui, Wellington",
      navtitle: "2025 Beastwars",
      summary: "Riffs for days",
      metadesc: "Concert review of Beastwars at Meow Nui, Wellington, 22 November 2025.",
      date: "2025-11-22",
      readingtime: "1 minute",
      headlineArtist: "Beastwars",
      supportArtists: ["Soft Bait", "Pull Down The Sun"],
      venue: "Meow Nui",
      city: "Wellington",
      country: "New Zealand",
      setlistfm: "Beastwars:734cb29d, Soft Bait:634cae87:empty, Pull Down The Sun:734cae81"
    });
  });

  it("omits supportArtists when there is only a headline artist", () => {
    const fm = gigFrontMatter({ ...BEASTWARS, performer: "Beastwars" }, { summary: "x" });
    expect(fm).to.not.have.property("supportArtists");
  });

  it("omits setlistfm when the column is blank", () => {
    const fm = gigFrontMatter(TEEN_JESUS, { summary: "x" });
    expect(fm).to.not.have.property("setlistfm");
  });

  it("omits photos when not given", () => {
    const fm = gigFrontMatter(BEASTWARS, { summary: "x" });
    expect(fm).to.not.have.property("photos");
  });

  it("sets photos to the given stem when given", () => {
    const fm = gigFrontMatter(BEASTWARS, { summary: "x", photos: "20251122-Beastwars-Meow-Nui-Wellington" });
    expect(fm.photos).to.equal("20251122-Beastwars-Meow-Nui-Wellington");
  });

  it("falls back to the Notes column when no summary is given", () => {
    const fm = gigFrontMatter(WITH_NOTES, {});
    expect(fm.summary).to.equal("Obey the Riff");
  });

  it("falls back to a placeholder when there is no summary or Notes text", () => {
    const fm = gigFrontMatter(SOLO_NO_NOTES, {});
    expect(fm.summary).to.equal("One line summary");
  });
});

describe("gig-stub — gigStem", () => {
  it("builds YYYYMMDD-Artist-Venue-City", () => {
    expect(gigStem(BEASTWARS)).to.equal("20251122-Beastwars-Meow-Nui-Wellington");
  });

  it("turns & into and and strips punctuation", () => {
    expect(gigStem(TEEN_JESUS)).to.equal("20260523-Teen-Jesus-and-the-Jean-Teasers-San-Fran-Wellington");
  });
});

describe("gig-stub — renderGigStub", () => {
  it("round-trips through gray-matter with the expected fields", () => {
    const fm = gigFrontMatter(BEASTWARS, { summary: "Riffs for days", photos: "20251122-Beastwars-Meow-Nui-Wellington" });
    const rendered = renderGigStub(fm);
    const { data, content } = matter(rendered);

    expect(data.title).to.equal("Beastwars @ Meow Nui, Wellington");
    expect(data.navtitle).to.equal("2025 Beastwars");
    expect(data.summary).to.equal("Riffs for days");
    expect(data.metadesc).to.equal("Concert review of Beastwars at Meow Nui, Wellington, 22 November 2025.");
    expect(data.date.toISOString().slice(0, 10)).to.equal("2025-11-22");
    expect(data.readingtime).to.equal("1 minute");
    expect(data.headlineArtist).to.equal("Beastwars");
    expect(data.supportArtists).to.deep.equal(["Soft Bait", "Pull Down The Sun"]);
    expect(data.venue).to.equal("Meow Nui");
    expect(data.city).to.equal("Wellington");
    expect(data.country).to.equal("New Zealand");
    expect(data.setlistfm).to.equal("Beastwars:734cb29d, Soft Bait:634cae87:empty, Pull Down The Sun:734cae81");
    expect(data.photos).to.equal("20251122-Beastwars-Meow-Nui-Wellington");
    expect(content).to.include("<!-- excerpt -->");
  });

  it("escapes an embedded single quote YAML-style", () => {
    const fm = gigFrontMatter({ ...BEASTWARS, performer: "Shepherd's Reign" }, { summary: "x" });
    const rendered = renderGigStub(fm);
    const { data } = matter(rendered);
    expect(data.headlineArtist).to.equal("Shepherd's Reign");
  });

  it("keeps date unquoted so gray-matter parses it as a Date", () => {
    const fm = gigFrontMatter(BEASTWARS, { summary: "x" });
    const rendered = renderGigStub(fm);
    expect(rendered).to.match(/^date: 2025-11-22$/m);
  });

  it("omits supportArtists/setlistfm/photos lines when absent from front matter", () => {
    const fm = gigFrontMatter(SOLO_NO_EXTRAS, { summary: "x" });
    const rendered = renderGigStub(fm);
    expect(rendered).to.not.include("supportArtists:");
    expect(rendered).to.not.include("setlistfm:");
    expect(rendered).to.not.include("photos:");
  });
});

describe("parseNewGigArgs", () => {
  it("reads the artist alone (listing mode) when there is no --summary", () => {
    expect(parseNewGigArgs(["Beastwars"])).to.deep.equal({
      artist: "Beastwars", date: undefined, summary: undefined, withPhotos: false
    });
  });

  it("reads artist and date without --summary", () => {
    const parsed = parseNewGigArgs(["Beastwars", "2025-11-22"]);
    expect(parsed.artist).to.equal("Beastwars");
    expect(parsed.date).to.equal("2025-11-22");
  });

  it("takes the argument after --summary as the summary, wherever it appears", () => {
    expect(parseNewGigArgs(["--summary", "Loud.", "Beastwars", "2025-11-22", "--photos"])).to.deep.equal({
      artist: "Beastwars", date: "2025-11-22", summary: "Loud.", withPhotos: true
    });
    expect(parseNewGigArgs(["Beastwars", "2025-11-22", "--summary", "Loud."])).to.deep.equal({
      artist: "Beastwars", date: "2025-11-22", summary: "Loud.", withPhotos: false
    });
  });

  it("leaves artist undefined when no positional arguments are given", () => {
    expect(parseNewGigArgs(["--photos"]).artist).to.equal(undefined);
    expect(parseNewGigArgs([]).artist).to.equal(undefined);
  });
});
