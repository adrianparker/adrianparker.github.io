import { expect } from "chai";
import { parseGigHistory } from "../../lib/gig-history.mjs";

const TABLE = [
  "# Adrian's Gig History",
  "",
  "Some description text.",
  "",
  "| Date | Show | Category | City | Country | Venue | Notes | Association | Setlist.fm ID |",
  "|---|---|---|---|---|---|---|---|---|",
  "| 2026-06-27 | Hadestown: Teen Edition | Theatre | Paraparaumu | New Zealand | Coastlands Theatre | Hadestown: Teen Edition | Weta | 8a1b2c3d |",
  "| 2026-05-01 | Fat Freddy's Drop | Music | Wellington | New Zealand | Michael Fowler Centre | | | |"
].join("\n");

describe("gig-history — parseGigHistory", () => {
  it("parses each data row into a gig object", () => {
    const rows = parseGigHistory(TABLE);
    expect(rows).to.have.lengthOf(2);
    expect(rows[0]).to.deep.equal({
      date: "2026-06-27",
      performer: "Hadestown: Teen Edition",
      category: "Theatre",
      city: "Paraparaumu",
      country: "New Zealand",
      venue: "Coastlands Theatre",
      show: "Hadestown: Teen Edition",
      association: "Weta",
      setlistfmId: "8a1b2c3d"
    });
  });

  it("keeps an empty show field as an empty string", () => {
    const rows = parseGigHistory(TABLE);
    expect(rows[1].show).to.equal("");
  });

  it("stops at the first line after the table that is not a row", () => {
    const withTrailer = `${TABLE}\n\nSome trailing note.\n`;
    expect(parseGigHistory(withTrailer)).to.have.lengthOf(2);
  });

  it("throws on a data row with too few columns", () => {
    const withBadRow = `${TABLE}\n| 2026-01-01 | Missing Columns |`;
    expect(() => parseGigHistory(withBadRow)).to.throw(/has 2 column\(s\), expected 9/);
  });

  it("throws on a data row with too many columns", () => {
    const withBadRow = `${TABLE}\n| 2026-01-01 | Too | Many | Columns | Here | Than | Should | Be | Present | Really |`;
    expect(() => parseGigHistory(withBadRow)).to.throw(/has 10 column\(s\), expected 9/);
  });

  it("returns an empty array when there is no header row", () => {
    expect(parseGigHistory("just some text\nwith no table\n")).to.deep.equal([]);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseGigHistory("")).to.deep.equal([]);
  });
});
