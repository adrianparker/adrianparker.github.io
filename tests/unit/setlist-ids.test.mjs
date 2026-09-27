import { expect } from "chai";
import { parseSetlistIds, anyVisibleChip } from "../../lib/setlist-ids.mjs";

describe("setlist-ids — parseSetlistIds", () => {
  it("returns an empty Map for undefined/blank input", () => {
    expect(parseSetlistIds(undefined)).to.deep.equal(new Map());
    expect(parseSetlistIds("")).to.deep.equal(new Map());
  });

  it("parses a single performer:id pair", () => {
    const ids = parseSetlistIds("Portishead:63d72643");
    expect(ids.get("Portishead")).to.deep.equal({ id: "63d72643", empty: false });
    expect(ids.size).to.equal(1);
  });

  it("parses multiple comma-separated pairs", () => {
    const ids = parseSetlistIds("W.A.S.P.:34b29cb, KK's Priest:234b28ef");
    expect(ids.get("W.A.S.P.")).to.deep.equal({ id: "34b29cb", empty: false });
    expect(ids.get("KK's Priest")).to.deep.equal({ id: "234b28ef", empty: false });
    expect(ids.size).to.equal(2);
  });

  it("marks a trailing :empty suffix and strips it from the id", () => {
    const ids = parseSetlistIds("Hollie Smith:b776dce:empty");
    expect(ids.get("Hollie Smith")).to.deep.equal({ id: "b776dce", empty: true });
  });

  it("unescapes a literal comma in a performer name", () => {
    const ids = parseSetlistIds("Does It Offend You\\, Yeah?:53da1761:empty");
    expect(ids.get("Does It Offend You, Yeah?")).to.deep.equal({ id: "53da1761", empty: true });
    expect(ids.size).to.equal(1);
  });

  it("ignores an entry with no colon", () => {
    const ids = parseSetlistIds("Some Artist With No Id");
    expect(ids.size).to.equal(0);
  });

  it("ignores an entry with a blank name or blank id", () => {
    expect(parseSetlistIds(":63d72643").size).to.equal(0);
    expect(parseSetlistIds("Portishead:").size).to.equal(0);
  });

  it("trims surrounding whitespace around names and ids", () => {
    const ids = parseSetlistIds("  Portishead : 63d72643  ,  Foo : bar:empty ");
    expect(ids.get("Portishead")).to.deep.equal({ id: "63d72643", empty: false });
    expect(ids.get("Foo")).to.deep.equal({ id: "bar", empty: true });
  });
});

describe("setlist-ids — anyVisibleChip", () => {
  it("is true when a name has a non-empty id", () => {
    const ids = parseSetlistIds("W.A.S.P.:34b29cb, KK's Priest:234b28ef");
    expect(anyVisibleChip(ids, ["W.A.S.P.", "KK's Priest"])).to.be.true;
  });

  it("is false when no name has an id", () => {
    const ids = parseSetlistIds("");
    expect(anyVisibleChip(ids, ["Someone"])).to.be.false;
  });

  it("is false when the only id present is marked :empty", () => {
    const ids = parseSetlistIds("Hollie Smith:b776dce:empty");
    expect(anyVisibleChip(ids, ["Hollie Smith"])).to.be.false;
  });

  it("is true when at least one of several names has a visible id", () => {
    const ids = parseSetlistIds("Pixies:634e6e1b, Elliot & Vincent:4b4c83ae:empty");
    expect(anyVisibleChip(ids, ["Pixies", "Elliot & Vincent"])).to.be.true;
  });
});
