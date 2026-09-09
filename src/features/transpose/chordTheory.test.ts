import { detectOriginalKey, semitonesBetweenKeys, transposeChord } from "./chordTheory";
import { createEmptySong, createLine, createSection, createSegment } from "../../types/song";

describe("transposeChord", () => {
  it("transposes plain major chords up and down", () => {
    expect(transposeChord("G", 2)).toBe("A");
    expect(transposeChord("G", -2)).toBe("F");
  });

  it("preserves chord quality and extensions", () => {
    expect(transposeChord("Am7", 3)).toBe("Cm7");
    expect(transposeChord("Cmaj7", 2)).toBe("Dmaj7");
    expect(transposeChord("Dsus4", 5)).toBe("Gsus4");
  });

  it("transposes slash chords, moving both root and bass", () => {
    expect(transposeChord("G/B", 2)).toBe("A/C#");
    expect(transposeChord("D/F#", -2)).toBe("C/E");
  });

  it("wraps around the octave in both directions", () => {
    expect(transposeChord("B", 1)).toBe("C");
    expect(transposeChord("C", -1)).toBe("B");
    expect(transposeChord("G", 12)).toBe("G");
  });

  it("keeps flat spelling when the input used flats, sharp spelling otherwise", () => {
    expect(transposeChord("Bb", 2)).toBe("C");
    expect(transposeChord("Eb", 1)).toBe("E");
    expect(transposeChord("F#", 1)).toBe("G");
  });

  it("returns non-chord text unchanged", () => {
    expect(transposeChord("N.C.", 3)).toBe("N.C.");
  });

  it("is a no-op for zero semitones", () => {
    expect(transposeChord("C#m7b5", 0)).toBe("C#m7b5");
  });
});

describe("semitonesBetweenKeys", () => {
  it("computes the shortest forward distance between two keys", () => {
    expect(semitonesBetweenKeys("C", "D")).toBe(2);
    expect(semitonesBetweenKeys("G", "C")).toBe(5);
    expect(semitonesBetweenKeys("C", "C")).toBe(0);
    expect(semitonesBetweenKeys("D", "C")).toBe(10);
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

  it("returns null when the song has no chords at all", () => {
    const song = createEmptySong("Untitled");
    song.sections.push(createSection("Verse 1", [createLine([createSegment({ chord: null, lyric: "lyrics only" })])]));

    expect(detectOriginalKey(song)).toBeNull();
  });
});
