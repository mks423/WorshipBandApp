import { isChordToken, repairMisreadChord, splitGluedChordToken } from "./chordPattern";

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

  // Every case below is a chord symbol copied verbatim from a real scanned
  // worship chart, kept as a regression net for OCR-driven grammar gaps.
  it("accepts parenthesized quality/alteration suffixes ('B(SUS4)', 'Db7(#11)', 'C#m7(b5)', 'B7(b9)')", () => {
    expect(isChordToken("B(SUS4)")).toBe(true);
    expect(isChordToken("D(sus4)")).toBe(true);
    expect(isChordToken("Db7(#11)")).toBe(true);
    expect(isChordToken("C#m7(b5)")).toBe(true);
    expect(isChordToken("B7(b9)")).toBe(true);
  });

  it("accepts a bracketed cue-chord group's edge tokens ('(Em7', 'C)')", () => {
    expect(isChordToken("(Em7")).toBe(true);
    expect(isChordToken("C)")).toBe(true);
  });

  it("accepts capital-M major-seventh notation distinct from minor 'm' ('CM7', 'DM7', 'FM7')", () => {
    expect(isChordToken("CM7")).toBe(true);
    expect(isChordToken("DM7")).toBe(true);
    expect(isChordToken("FM7")).toBe(true);
    // "m" (minor) must stay distinct from "M" (major) — never collapse the two.
    expect(isChordToken("Cm7")).toBe(true);
  });

  it("accepts tone-omission notation ('Ano3')", () => {
    expect(isChordToken("Ano3")).toBe(true);
    expect(isChordToken("Gno5")).toBe(true);
  });

  it("accepts a superscript-digit extension ('C⁷')", () => {
    expect(isChordToken("C⁷")).toBe(true);
    expect(isChordToken("F#m⁷")).toBe(true);
  });

  it("still rejects lyric words after normalization", () => {
    expect(isChordToken("Sunday")).toBe(false);
    expect(isChordToken("Amen")).toBe(false);
    expect(isChordToken("Base")).toBe(false);
  });

  it("accepts mixed-case parenthesized suffixes ('B(Sus4)', 'B(sUS4)')", () => {
    expect(isChordToken("B(Sus4)")).toBe(true);
    expect(isChordToken("B(sUS4)")).toBe(true);
  });

  it("accepts full-width CJK parentheses some Korean-typeset charts use ('B（SUS4）')", () => {
    expect(isChordToken("B（SUS4）")).toBe(true);
  });

  it("accepts a token with incidental internal whitespace from a noisy OCR merge ('B ( SUS4 )')", () => {
    expect(isChordToken("B ( SUS4 )")).toBe(true);
  });

  it("accepts multiple tone omissions on one chord ('Ano3no5')", () => {
    expect(isChordToken("Ano3no5")).toBe(true);
  });

  it("accepts a combined 6/9 extension ('C6/9')", () => {
    expect(isChordToken("C6/9")).toBe(true);
  });

  it("accepts jazz-shorthand quality symbols ('C+', 'C-7', 'CΔ7', 'Bø7', 'B°', 'C7+5', 'C7-5')", () => {
    expect(isChordToken("C+")).toBe(true);
    expect(isChordToken("C-7")).toBe(true);
    expect(isChordToken("CΔ7")).toBe(true);
    expect(isChordToken("Bø7")).toBe(true);
    expect(isChordToken("B°")).toBe(true);
    expect(isChordToken("C7+5")).toBe(true);
    expect(isChordToken("C7-5")).toBe(true);
  });

  it("accepts a full-width digit extension ('C７')", () => {
    expect(isChordToken("C７")).toBe(true);
  });
});

describe("splitGluedChordToken", () => {
  it("splits two chords packed with no visual gap ('Am7G/B', 'C#m7C')", () => {
    expect(splitGluedChordToken("Am7G/B")).toEqual(["Am7", "G/B"]);
    expect(splitGluedChordToken("C#m7C")).toEqual(["C#m7", "C"]);
  });

  it("leaves an already-valid single chord untouched", () => {
    expect(splitGluedChordToken("Am7")).toEqual(["Am7"]);
  });

  it("leaves ordinary lyric words untouched", () => {
    expect(splitGluedChordToken("Amazing")).toEqual(["Amazing"]);
    expect(splitGluedChordToken("Amen")).toEqual(["Amen"]);
  });
});

describe("repairMisreadChord", () => {
  it("fixes a misread '8' back to 'B'", () => {
    expect(repairMisreadChord("8m7")).toBe("Bm7");
    expect(repairMisreadChord("8")).toBe("B");
  });

  it("fixes a misread extension digit ('S' for '5', 'Z' for '2', 'l' for '1')", () => {
    expect(repairMisreadChord("AaddZ")).toBe("Aadd2");
    expect(repairMisreadChord("B7bS")).toBe("B7b5");
    // Only the second "1" of "add11" was misread as "l" — the correction only
    // has to fix that one character since the rest of the token already reads right.
    expect(repairMisreadChord("Caddl1")).toBe("Cadd11");
  });

  it("leaves an already-valid chord untouched", () => {
    expect(repairMisreadChord("Bm7")).toBe("Bm7");
  });

  it("leaves a token unchanged when no single substitution makes it valid", () => {
    expect(repairMisreadChord("8888")).toBe("8888");
    // Both digits of "11" misread at once needs two simultaneous fixes,
    // which is out of scope — only single-character misreads are repaired.
    expect(repairMisreadChord("CaddIl")).toBe("CaddIl");
  });

  it("never turns an ordinary lyric word into a chord", () => {
    expect(repairMisreadChord("Ball")).toBe("Ball");
    expect(repairMisreadChord("Base")).toBe("Base");
    expect(repairMisreadChord("Blessed")).toBe("Blessed");
    expect(repairMisreadChord("grace")).toBe("grace");
  });
});
