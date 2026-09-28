import { expect } from "chai";
import { parseSetlistSongs, songsHeardLive } from "../../lib/setlist-songs.mjs";

const TABLE = [
  "# Setlist songs",
  "",
  "Some description text.",
  "",
  "| Setlist.fm ID | Performer | Date | Song |",
  "|---|---|---|---|",
  "| 2358f4bb | Shihad | 2025-03-16 | Factory |",
  "| 2358f4bb | Shihad | 2025-03-16 | Home Again |",
  "| bbb0000 | Wet \\| Dry | 2020-01-01 | Escaped \\| Title |",
  "| ccc0000 | No Songs | 2019-01-01 |  |"
].join("\n");

describe("setlist-songs — parseSetlistSongs", () => {
  it("parses each song row", () => {
    const rows = parseSetlistSongs(TABLE);
    expect(rows).to.deep.include({ id: "2358f4bb", performer: "Shihad", date: "2025-03-16", song: "Factory" });
    expect(rows).to.deep.include({ id: "2358f4bb", performer: "Shihad", date: "2025-03-16", song: "Home Again" });
  });

  it("unescapes a literal pipe in performer and song fields", () => {
    const rows = parseSetlistSongs(TABLE);
    const row = rows.find((r) => r.id === "bbb0000");
    expect(row.performer).to.equal("Wet | Dry");
    expect(row.song).to.equal("Escaped | Title");
  });

  it("skips a row with a blank Song cell", () => {
    const rows = parseSetlistSongs(TABLE);
    expect(rows.some((r) => r.id === "ccc0000")).to.be.false;
  });

  it("stops at the first line after the table that is not a row", () => {
    const withTrailer = `${TABLE}\n\nSome trailing note.\n`;
    expect(parseSetlistSongs(withTrailer)).to.have.lengthOf(3);
  });

  it("returns an empty array when there is no header row", () => {
    expect(parseSetlistSongs("just some text\nwith no table\n")).to.deep.equal([]);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseSetlistSongs("")).to.deep.equal([]);
  });
});

describe("setlist-songs — songsHeardLive", () => {
  const setlistSongs = [
    { id: "111", performer: "Shihad", date: "2018-10-20", song: "Home Again" },
    { id: "111", performer: "Shihad", date: "2018-10-20", song: "You Again" },
    { id: "222", performer: "Shihad", date: "2023-03-18", song: "Home Again" },
    { id: "222", performer: "Shihad", date: "2023-03-18", song: "Alive" }
  ];

  it("counts a song once per gig whose setlist included it", () => {
    const gigRows = [
      { setlistfmId: "Shihad:111" },
      { setlistfmId: "Shihad:222" }
    ];
    const result = songsHeardLive("Shihad", gigRows, setlistSongs);
    expect(result).to.deep.equal([
      { song: "Home Again", count: 2 },
      { song: "Alive", count: 1 },
      { song: "You Again", count: 1 }
    ]);
  });

  it("sorts ties by title ascending, case-insensitively", () => {
    const songs = [
      { id: "111", performer: "Shihad", date: "2018-10-20", song: "beta" },
      { id: "111", performer: "Shihad", date: "2018-10-20", song: "Alpha" }
    ];
    const result = songsHeardLive("Shihad", [{ setlistfmId: "Shihad:111" }], songs);
    expect(result).to.deep.equal([
      { song: "Alpha", count: 1 },
      { song: "beta", count: 1 }
    ]);
  });

  it("only counts the id belonging to the given performer on a shared bill", () => {
    const gigRows = [{ setlistfmId: "Shihad:111, Support Act:999" }];
    const result = songsHeardLive("Support Act", gigRows, setlistSongs);
    expect(result).to.deep.equal([]);
  });

  it("ignores a gig with no setlist id for that performer", () => {
    const result = songsHeardLive("Shihad", [{ setlistfmId: "" }], setlistSongs);
    expect(result).to.deep.equal([]);
  });

  it("returns an empty array when no gig rows are given", () => {
    expect(songsHeardLive("Shihad", [], setlistSongs)).to.deep.equal([]);
  });
});
