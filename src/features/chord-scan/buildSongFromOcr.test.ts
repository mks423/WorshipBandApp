import { buildSongFromOcr, buildSongsFromPages } from "./buildSongFromOcr";
import type { OcrToken } from "./types";

function token(text: string, x: number, y: number, width = text.length * 8): OcrToken {
  return { text, x, y, width, height: 20 };
}

describe("buildSongFromOcr", () => {
  it("starts a section from a section-label line and pairs the chord line with the lyric line beneath it", () => {
    const tokens: OcrToken[] = [
      token("Verse", 10, 0),
      token("1", 60, 0),
      token("G", 10, 40),
      token("C", 90, 40),
      token("Amazing", 8, 70),
      token("grace", 85, 70),
      token("how", 140, 70),
      token("sweet", 175, 70),
    ];

    const song = buildSongFromOcr(tokens, "Amazing Grace");

    expect(song.title).toBe("Amazing Grace");
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].name).toBe("Verse 1");
    expect(song.sections[0].lines).toHaveLength(1);

    const segments = song.sections[0].lines[0].segments;
    expect(segments.map((s) => [s.chord, s.lyric.trim()])).toEqual([
      ["G", "Amazing"],
      ["C", "grace how sweet"],
    ]);
  });

  it("treats a line with no matching chord line above it as plain lyric", () => {
    const tokens: OcrToken[] = [token("Just", 10, 0), token("a", 60, 0), token("lyric", 90, 0), token("line", 140, 0)];

    const song = buildSongFromOcr(tokens, "Untitled");

    const segments = song.sections[0].lines[0].segments;
    expect(segments).toHaveLength(1);
    expect(segments[0].chord).toBeNull();
    expect(segments[0].lyric).toBe("Just a lyric line");
  });

  it("keeps chords with empty lyrics when a chord line has nothing beneath it", () => {
    const tokens: OcrToken[] = [token("G", 10, 0), token("D", 90, 0)];

    const song = buildSongFromOcr(tokens, "Instrumental");

    const segments = song.sections[0].lines[0].segments;
    expect(segments.map((s) => s.chord)).toEqual(["G", "D"]);
    expect(segments.every((s) => s.lyric.trim() === "")).toBe(true);
  });

  it("attaches the source image and each chord's original pixel position when given one", () => {
    const tokens: OcrToken[] = [
      token("G", 10, 40),
      token("C", 90, 40),
      token("Amazing", 8, 70),
      token("grace", 85, 70),
    ];
    const sourceImage = { uri: "file:///chart.jpg", width: 800, height: 600 };

    const song = buildSongFromOcr(tokens, "Amazing Grace", sourceImage);

    expect(song.sourceImage).toEqual(sourceImage);
    const segments = song.sections[0].lines[0].segments;
    expect(segments[0].chordPosition).toEqual({ x: 10, y: 40, width: 8, height: 20 });
    expect(segments[1].chordPosition).toEqual({ x: 90, y: 40, width: 8, height: 20 });
  });
});

describe("buildSongsFromPages", () => {
  it("builds one independent song per page, each keeping its own title and source image", () => {
    const page1: OcrToken[] = [token("G", 10, 0), token("Amazing", 8, 40)];
    const page2: OcrToken[] = [token("D", 10, 0), token("grace", 8, 40)];
    const sourceImage1 = { uri: "file:///page1.png", width: 800, height: 600 };
    const sourceImage2 = { uri: "file:///page2.png", width: 800, height: 600 };

    const songs = buildSongsFromPages([
      { tokens: page1, title: "곡 A (1/2)", sourceImage: sourceImage1 },
      { tokens: page2, title: "곡 A (2/2)", sourceImage: sourceImage2 },
    ]);

    expect(songs).toHaveLength(2);
    expect(songs[0].title).toBe("곡 A (1/2)");
    expect(songs[0].sourceImage).toEqual(sourceImage1);
    expect(songs[0].sections[0].lines[0].segments[0]).toMatchObject({ chord: "G", lyric: "Amazing" });
    expect(songs[1].title).toBe("곡 A (2/2)");
    expect(songs[1].sourceImage).toEqual(sourceImage2);
    expect(songs[1].sections[0].lines[0].segments[0]).toMatchObject({ chord: "D", lyric: "grace" });
  });

  it("skips pages with no recognized text", () => {
    const songs = buildSongsFromPages([
      { tokens: [], title: "Blank page" },
      { tokens: [token("G", 10, 0), token("Amazing", 8, 40)], title: "Amazing Grace" },
    ]);

    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe("Amazing Grace");
  });

  it("returns an empty array when every page has no recognized text", () => {
    const songs = buildSongsFromPages([
      { tokens: [], title: "A" },
      { tokens: [], title: "B" },
    ]);
    expect(songs).toEqual([]);
  });
});
