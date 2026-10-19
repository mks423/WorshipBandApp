import { parseKey } from "../../domain/music-theory";
import { createEmptySong, createLine, createSection, createSegment } from "../../types/song";
import { countChordIssues, reviewSegmentChord } from "./chordReview";

const A = parseKey("A");
const F = parseKey("F");
const ocr = (chord: string) => createSegment({ chord, lyric: "x", confidence: 0.8 });

describe("reviewSegmentChord", () => {
  // Real misreads from a Psalm 139 lead sheet (A major) and a "You Are My All in All" chart (F major).
  it.each(["Acad", "BVE", "EER", "Adida", "CHE", "11-Bb", "-ABD", "C'"])("flags %s as unrecognized", (chord) => {
    expect(reviewSegmentChord(ocr(chord), A)).toBe("unrecognized");
  });

  it("flags a natural the key sharps — the dropped-♯ misread that looks like a valid chord", () => {
    expect(reviewSegmentChord(ocr("A/C"), A)).toBe("missing-accidental");
    expect(reviewSegmentChord(ocr("G"), A)).toBe("missing-accidental");
    expect(reviewSegmentChord(ocr("F"), A)).toBe("missing-accidental");
  });

  it("flags a natural the key flats", () => {
    expect(reviewSegmentChord(ocr("B"), F)).toBe("missing-accidental");
    expect(reviewSegmentChord(ocr("F/B"), F)).toBe("missing-accidental");
  });

  it("passes correctly spelled chords, including ones with parentheses", () => {
    for (const chord of ["A", "E/A", "B/E", "A/C#", "C#m", "F#m7", "A(add2)", "Bsus4", "D"]) {
      expect(reviewSegmentChord(ocr(chord), A)).toBeNull();
    }
    for (const chord of ["F", "C/E", "Dm", "F/C", "Bb", "Bb/C", "C7"]) {
      expect(reviewSegmentChord(ocr(chord), F)).toBeNull();
    }
  });

  it("trusts chords the user typed or confirmed (no confidence)", () => {
    expect(reviewSegmentChord(createSegment({ chord: "G", lyric: "x" }), A)).toBeNull();
    expect(reviewSegmentChord(createSegment({ chord: "Acad", lyric: "x" }), A)).toBeNull();
  });

  it("ignores measure numbers, no-chord marks, and empty slots", () => {
    expect(reviewSegmentChord(ocr("16"), A)).toBeNull();
    expect(reviewSegmentChord(ocr("N.C."), A)).toBeNull();
    expect(reviewSegmentChord(createSegment({ chord: null, lyric: "x", confidence: 0.5 }), A)).toBeNull();
  });

  it("skips the key-based check when the key is unknown", () => {
    expect(reviewSegmentChord(ocr("A/C"), null)).toBeNull();
    expect(reviewSegmentChord(ocr("Acad"), null)).toBe("unrecognized");
  });
});

describe("countChordIssues", () => {
  it("counts flagged slots across the whole song", () => {
    const song = createEmptySong("t");
    song.sections.push(createSection("V", [createLine([ocr("A"), ocr("Acad"), ocr("A/C"), ocr("E/A")])]));
    expect(countChordIssues(song, A)).toBe(2);
  });
});
