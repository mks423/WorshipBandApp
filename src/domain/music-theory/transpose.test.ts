import {
  formatKey,
  keyChoices,
  keyForPitchClass,
  mod,
  parseChordSymbol,
  parseKey,
  pitchClass,
  transposeChordText,
  type Key,
  type Mode,
} from "./index";

function key(text: string): Key {
  const parsed = parseKey(text);
  if (!parsed) throw new Error(`bad key in test: ${text}`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Independent oracle: spell a key's scale from its key signature the way a
// theory textbook does (sharps added in the order F C G D A E B, flats in
// B E A D G C F), without touching any of the code under test.
// ---------------------------------------------------------------------------

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

/** Signature for every conventional key name, written out by hand. */
const SIGNATURES: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1,
  Am: 0, Em: 1, Bm: 2, "F#m": 3, "C#m": 4, "G#m": 5, "D#m": 6, Ebm: -6, Bbm: -5, Fm: -4, Cm: -3, Gm: -2, Dm: -1,
};

function oracleScale(keyName: string): string[] {
  const fifths = SIGNATURES[keyName];
  const altered = fifths >= 0 ? SHARP_ORDER.slice(0, fifths) : FLAT_ORDER.slice(0, -fifths);
  const accidental = fifths >= 0 ? "#" : "b";
  const start = LETTERS.indexOf(keyName[0]);
  return Array.from({ length: 7 }, (_, i) => {
    const letter = LETTERS[(start + i) % 7];
    return altered.includes(letter) ? letter + accidental : letter;
  });
}

/** Diatonic chord on each scale degree, as qualities (I ii iii IV V vi vii° in major; i ii° III iv v VI VII in minor). */
const QUALITIES: Record<Mode, string[]> = {
  major: ["", "m7", "m", "maj7", "7", "m", "m7b5"],
  minor: ["m", "m7b5", "", "m7", "m", "maj7", "sus4"],
};

/** A realistic diatonic chart in `keyName`, including slash chords, built from the oracle scale. */
function diatonicChart(keyName: string, mode: Mode): string[] {
  const s = oracleScale(keyName);
  const chords = s.map((root, i) => root + QUALITIES[mode][i]);
  // Inversions and pedal basses that are everywhere in worship charts: I/3, IV/1, V/7, vi/5, IV/5.
  chords.push(`${s[0]}/${s[2]}`, `${s[3]}/${s[0]}`, `${s[4]}/${s[6]}`, `${s[5]}m/${s[4]}`, `${s[3]}2/${s[4]}`);
  chords.push(`${s[0]}6/9`, `${s[3]}add9`, `${s[4]}sus4`);
  return chords;
}

const ALL_KEY_NAMES = Object.keys(SIGNATURES);
const modeOf = (name: string): Mode => (name.endsWith("m") ? "minor" : "major");

// ---------------------------------------------------------------------------

describe("transposeChordText — golden test over every key pair", () => {
  it("spells every diatonic chord as the target key's own scale degree, for all 12×12 key pairs in both modes", () => {
    let checked = 0;
    for (const fromName of ALL_KEY_NAMES) {
      for (const toName of ALL_KEY_NAMES) {
        if (modeOf(fromName) !== modeOf(toName)) continue;
        const mode = modeOf(fromName);
        const source = diatonicChart(fromName, mode);
        const expected = diatonicChart(toName, mode);
        const actual = source.map((c) => transposeChordText(c, key(fromName), key(toName)));
        expect({ from: fromName, to: toName, chords: actual }).toEqual({ from: fromName, to: toName, chords: expected });
        checked += 1;
      }
    }
    // 13 major names × 13 + 13 minor names × 13 (F#/Gb and D#m/Ebm both included).
    expect(checked).toBe(338);
  });

  it("keeps chromatic chords at the right pitch, never with a double sharp or double flat", () => {
    // Borrowed and secondary chords that show up on real charts, from a few
    // source keys: bIII, bVI, bVII, II7 (V/V), III7 (V/vi), #ivø, bII, VI7, #v°7, #i°.
    const chromatic: Record<string, string[]> = {
      C: ["Eb", "Ab", "Bb", "D7", "E7", "F#m7b5", "Db", "A7", "G#dim7", "C#dim"],
      E: ["G", "C", "D", "F#7", "G#7", "A#m7b5", "F", "C#7", "B#dim7", "Fdim"],
      Db: ["E", "A", "B", "Eb7", "F7", "Gm7b5", "D", "Bb7", "Adim7", "Ddim"],
    };
    for (const [fromName, chords] of Object.entries(chromatic)) {
      for (const toName of ALL_KEY_NAMES.filter((n) => modeOf(n) === "major")) {
        const shift = pitchClass(key(toName).tonic) - pitchClass(key(fromName).tonic);
        for (const chord of chords) {
          const result = transposeChordText(chord, key(fromName), key(toName));
          expect(result).not.toMatch(/^[A-G](##|bb)|\/[A-G](##|bb)/);
          const before = parseChordSymbol(chord)!;
          const after = parseChordSymbol(result)!;
          expect(mod(pitchClass(after.root) - pitchClass(before.root) - shift, 12)).toBe(0);
          expect(after.quality).toBe(before.quality);
        }
      }
    }
  });
});

describe("transposeChordText — cases the old semitone transposer got wrong", () => {
  it.each([
    ["C", "G", "F", "Bb"],
    ["C/E", "G", "F", "Bb/D"],
    ["G", "G", "Ab", "Ab"],
    ["C", "G", "Ab", "Db"],
    ["D", "G", "Ab", "Eb"],
    ["Em", "G", "Ab", "Fm"],
    ["Bm", "G", "Ab", "Cm"],
    ["D/F#", "G", "Ab", "Eb/G"],
    ["Ab", "Eb", "E", "A"],
    ["Bb", "Eb", "E", "B"],
    ["Cm", "Eb", "E", "C#m"],
    ["Gm", "Eb", "E", "G#m"],
    ["F#m", "D", "Eb", "Gm"],
    ["Am", "C", "Db", "Bbm"],
  ])("%s in %s → %s gives %s", (chord, from, to, expected) => {
    expect(transposeChordText(chord, key(from), key(to))).toBe(expected);
  });
});

describe("transposeChordText — white-key enharmonics", () => {
  it("keeps E#, B#, Cb and Fb when the target key really uses them", () => {
    expect(transposeChordText("F#m7b5", key("G"), key("F#"))).toBe("E#m7b5");
    expect(transposeChordText("C", key("G"), key("Gb"))).toBe("Cb");
  });

  it("otherwise writes them as the plain natural", () => {
    // A legacy "A#" (really Bb, the IV of F) saved by the old transposer, moved F → G.
    expect(transposeChordText("A#", key("F"), key("G"))).toBe("C");
    // bVII of Db reads as B, not Cb.
    expect(transposeChordText("Bb", key("C"), key("Db"))).toBe("B");
  });
});

describe("transposeChordText — chord text handling", () => {
  it("carries quality, extensions and alterations through verbatim", () => {
    expect(transposeChordText("C#m7b5", key("A"), key("Bb"))).toBe("Dm7b5");
    expect(transposeChordText("CM7", key("C"), key("D"))).toBe("DM7");
    expect(transposeChordText("CΔ7", key("C"), key("D"))).toBe("DΔ7");
    expect(transposeChordText("Ano3", key("A"), key("B"))).toBe("Bno3");
    expect(transposeChordText("G7#9", key("C"), key("F"))).toBe("C7#9");
  });

  it("treats 6/9 as an extension, not a slash chord", () => {
    expect(transposeChordText("C6/9", key("C"), key("Eb"))).toBe("Eb6/9");
    expect(transposeChordText("C6/9/E", key("C"), key("Eb"))).toBe("Eb6/9/G");
  });

  it("accepts unicode accidentals and writes ASCII ones", () => {
    expect(transposeChordText("B♭", key("F"), key("G"))).toBe("C");
    expect(transposeChordText("F♯m", key("D"), key("Eb"))).toBe("Gm");
  });

  it("returns non-chord text unchanged", () => {
    expect(transposeChordText("N.C.", key("G"), key("A"))).toBe("N.C.");
    expect(transposeChordText("%", key("G"), key("A"))).toBe("%");
    expect(transposeChordText("", key("G"), key("A"))).toBe("");
  });

  it("is a no-op when the keys are the same", () => {
    expect(transposeChordText("C#m7b5", key("A"), key("A"))).toBe("C#m7b5");
  });
});

describe("keyForPitchClass", () => {
  it("picks the conventional spelling with the fewest accidentals", () => {
    expect(keyChoices("major").map(formatKey)).toEqual(
      ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    );
    expect(keyChoices("minor").map(formatKey)).toEqual(
      ["Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"]
    );
  });

  it("lets preferFlat break the six-sharps/six-flats tie only", () => {
    expect(formatKey(keyForPitchClass(6, "major", true))).toBe("Gb");
    expect(formatKey(keyForPitchClass(3, "minor", true))).toBe("Ebm");
    expect(keyChoices("major", true).map(formatKey)).toEqual(
      ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
    );
  });
});

describe("parseKey", () => {
  it.each([
    ["G", "G"],
    ["Bb", "Bb"],
    ["E♭", "Eb"],
    ["F#m", "F#m"],
    ["C minor", "Cm"],
    ["D major", "D"],
  ])("parses %s", (text, formatted) => {
    expect(formatKey(key(text))).toBe(formatted);
  });

  it("rejects non-keys", () => {
    expect(parseKey("H")).toBeNull();
    expect(parseKey("Am7")).toBeNull();
    expect(parseKey("")).toBeNull();
  });
});
