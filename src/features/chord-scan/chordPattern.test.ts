import { isChordToken } from "./chordPattern";

describe("isChordToken", () => {
  it("accepts plain major/minor chords", () => {
    expect(isChordToken("G")).toBe(true);
    expect(isChordToken("Am")).toBe(true);
    expect(isChordToken("F#")).toBe(true);
    expect(isChordToken("Bb")).toBe(true);
  });

  it("accepts extended and altered chords", () => {
    expect(isChordToken("Am7")).toBe(true);
    expect(isChordToken("Cmaj7")).toBe(true);
    expect(isChordToken("C#m7b5")).toBe(true);
    expect(isChordToken("Dsus4")).toBe(true);
    expect(isChordToken("Gadd9")).toBe(true);
    expect(isChordToken("Edim7")).toBe(true);
  });

  it("accepts slash chords", () => {
    expect(isChordToken("G/B")).toBe(true);
    expect(isChordToken("D/F#")).toBe(true);
  });

  it("accepts no-chord markers", () => {
    expect(isChordToken("N.C.")).toBe(true);
    expect(isChordToken("%")).toBe(true);
  });

  it("rejects lyric words", () => {
    expect(isChordToken("Amazing")).toBe(false);
    expect(isChordToken("grace")).toBe(false);
    expect(isChordToken("how")).toBe(false);
    expect(isChordToken("the")).toBe(false);
  });

  it("rejects blank input", () => {
    expect(isChordToken("")).toBe(false);
    expect(isChordToken("   ")).toBe(false);
  });
});
