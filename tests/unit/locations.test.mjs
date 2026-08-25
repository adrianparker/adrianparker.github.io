import { expect } from "chai";
import { parseLocations, resolveLocation, findLocation } from "../../lib/locations.mjs";

const TABLE = [
  "# Gig Venue Locations",
  "",
  "Some description text.",
  "",
  "| Country | City | Venue | Location |",
  "|---|---|---|---|",
  "| New Zealand | Wellington | | -41.2865, 174.7762 |",
  "| New Zealand | Wellington | Michael Fowler Centre | -41.2862, 174.7768 |",
  "| New Zealand | Wellington | Bar Bodega | 101 Ghuznee Street, Te Aro, Wellington 6011, New Zealand |",
  "| New Zealand | Lower Hutt | Lucky Jacks | |",
  "| New Zealand | Grenada North | | |"
].join("\n");

describe("locations — parseLocations", () => {
  it("parses a row with numeric coordinates", () => {
    const rows = parseLocations(TABLE);
    expect(rows[1]).to.deep.equal({
      country: "New Zealand",
      city: "Wellington",
      venue: "Michael Fowler Centre",
      lat: -41.2862,
      lng: 174.7768
    });
  });

  it("parses a blank-venue row as the city-level entry", () => {
    const rows = parseLocations(TABLE);
    expect(rows[0]).to.deep.equal({
      country: "New Zealand",
      city: "Wellington",
      venue: "",
      lat: -41.2865,
      lng: 174.7762
    });
  });

  it("resolves a street address to null coordinates", () => {
    const rows = parseLocations(TABLE);
    expect(rows[2].lat).to.be.null;
    expect(rows[2].lng).to.be.null;
  });

  it("resolves a blank Location to null coordinates", () => {
    const rows = parseLocations(TABLE);
    expect(rows[3]).to.deep.equal({
      country: "New Zealand",
      city: "Lower Hutt",
      venue: "Lucky Jacks",
      lat: null,
      lng: null
    });
  });

  it("stops at the first line after the table that is not a row", () => {
    const withTrailer = `${TABLE}\n\nSome trailing note.\n`;
    expect(parseLocations(withTrailer)).to.have.lengthOf(5);
  });

  it("returns an empty array when there is no header row", () => {
    expect(parseLocations("just some text\nwith no table\n")).to.deep.equal([]);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseLocations("")).to.deep.equal([]);
  });
});

describe("locations — resolveLocation", () => {
  const rows = parseLocations(TABLE);

  it("returns the exact venue's coordinates when it has them", () => {
    expect(resolveLocation(rows, {
      country: "New Zealand", city: "Wellington", venue: "Michael Fowler Centre"
    })).to.deep.equal({ lat: -41.2862, lng: 174.7768 });
  });

  it("falls back to the city-level row when the venue has an address, not coordinates", () => {
    expect(resolveLocation(rows, {
      country: "New Zealand", city: "Wellington", venue: "Bar Bodega"
    })).to.deep.equal({ lat: -41.2865, lng: 174.7762 });
  });

  it("falls back to the city-level row when the venue isn't in the table at all", () => {
    expect(resolveLocation(rows, {
      country: "New Zealand", city: "Wellington", venue: "Some New Venue"
    })).to.deep.equal({ lat: -41.2865, lng: 174.7762 });
  });

  it("returns null when neither the venue nor the city-level row has coordinates", () => {
    expect(resolveLocation(rows, {
      country: "New Zealand", city: "Grenada North", venue: "Warehouse"
    })).to.be.null;
  });

  it("returns null when the country/city isn't in the table at all", () => {
    expect(resolveLocation(rows, {
      country: "Australia", city: "Perth", venue: ""
    })).to.be.null;
  });
});

describe("locations — findLocation", () => {
  const rows = parseLocations(TABLE);

  it("returns coordinates for an exact Country/City/Venue match", () => {
    expect(findLocation(rows, {
      country: "New Zealand", city: "Wellington", venue: "Michael Fowler Centre"
    })).to.deep.equal({ lat: -41.2862, lng: 174.7768 });
  });

  it("does not fall back to the city-level row when the exact venue has no coordinates", () => {
    expect(findLocation(rows, {
      country: "New Zealand", city: "Wellington", venue: "Bar Bodega"
    })).to.be.null;
  });

  it("returns null when the venue isn't in the table at all", () => {
    expect(findLocation(rows, {
      country: "New Zealand", city: "Wellington", venue: "Some New Venue"
    })).to.be.null;
  });
});
