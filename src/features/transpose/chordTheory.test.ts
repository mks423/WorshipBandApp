import { detectOriginalKey, semitonesBetweenKeys } from "./chordTheory";
import { createEmptySong, createLine, createSection, createSegment } from "../../types/song";

describe("semitonesBetweenKeys", () => {
  it("computes the shortest forward distance between two keys", () => {
    expect(semitonesBetweenKeys("C", "D")).toBe(2);
    expect(semitonesBetweenKeys("G", "C")).toBe(5);
    expect(semitonesBetweenKeys("C", "C")).toBe(0);
    expect(semitonesBetweenKeys("D", "C")).toBe(10);
  });

  it("accepts flat and minor key names", () => {
    expect(semitonesBetweenKeys("Bb", "C")).toBe(2);
    expect(semitonesBetweenKeys("Em", "F#m")).toBe(2);
  });
});

describe("detectOriginalKey", () => {
  it("guesses the key from the first chord in the song", () => {
    const song = createEmptySong("Amazing Grace");
    song.sections.push(
      createSection("Verse 1", [
        createLine([createSegment({ chord: "G", lyric: "Amazing " }), createSegment({ chord: "C", lyric: "grace" })]),
      ])
    );

    expect(detectOriginalKey(song)).toBe("G");
  });

  it("skips leading chordless lyric lines to find the first real chord", () => {
    const song = createEmptySong("Untitled");
    song.sections.push(
      createSection("Verse 1", [
        createLine([createSegment({ chord: null, lyric: "no chord here" })]),
        createLine([createSegment({ chord: "D/F#", lyric: "then a chord" })]),
      ])
    );

    expect(detectOriginalKey(song)).toBe("D");
  });

  it("reads a minor first chord as a minor key, but not a major seventh", () => {
    const minor = createEmptySong("Minor");
    minor.sections.push(createSection("Verse 1", [createLine([createSegment({ chord: "Em7", lyric: "x" })])]));
    expect(detectOriginalKey(minor)).toBe("Em");

    const majorSeventh = createEmptySong("Maj7");
    majorSeventh.sections.push(createSection("Verse 1", [createLine([createSegment({ chord: "Ebmaj7", lyric: "x" })])]));
    expect(detectOriginalKey(majorSeventh)).toBe("Eb");
  });

  it("returns null when the song has no chords at all", () => {
    const song = createEmptySong("Untitled");
    song.sections.push(createSection("Verse 1", [createLine([createSegment({ chord: null, lyric: "lyrics only" })])]));

    expect(detectOriginalKey(song)).toBeNull();
  });
});
