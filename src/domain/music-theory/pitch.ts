/**
 * Spelled pitch classes — the foundation every other music-theory module
 * builds on.
 *
 * A pitch is kept as a letter plus an alteration, never as a bare semitone
 * number, because B♭ and A♯ sound the same but are not interchangeable on a
 * chart: a song in F has a B♭ chord, never an A♯ one. Collapsing to
 * semitones first and re-spelling afterward is exactly what made the
 * previous transposer print "A#" for the IV chord of F.
 *
 * Octave is deliberately absent: chord symbols and keys don't carry one.
 * Note-level (staff) pitches will extend this with an octave later.
 */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];

const NATURAL_PITCH_CLASS: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTER_LINE_OF_FIFTHS: Record<Letter, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };

export interface SpelledPitch {
  letter: Letter;
  /** Semitones of alteration: -1 = flat, +1 = sharp, ±2 = double flat/sharp. */
  alter: number;
}

/** Euclidean modulo — always in [0, m), unlike `%` for negative numbers. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function pitchClass(pitch: SpelledPitch): number {
  return mod(NATURAL_PITCH_CLASS[pitch.letter] + pitch.alter, 12);
}

export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/**
 * Position on the line of fifths (…B♭=-2, F=-1, C=0, G=1, D=2…, F♯=6). For a
 * major key's tonic this is exactly its key signature: positive = that many
 * sharps, negative = that many flats.
 */
export function lineOfFifths(pitch: SpelledPitch): number {
  return LETTER_LINE_OF_FIFTHS[pitch.letter] + 7 * pitch.alter;
}

/** Spells pitch class `pc` on the given letter, with whatever alteration that takes (in [-6, 5]). */
export function spellOnLetter(pc: number, letter: Letter): SpelledPitch {
  return { letter, alter: mod(pc - NATURAL_PITCH_CLASS[letter] + 6, 12) - 6 };
}

/** Every spelling of `pc` with at most one accidental (e.g. 10 → A♯, B♭), in letter order. */
export function simpleSpellings(pc: number): SpelledPitch[] {
  return LETTERS.map((letter) => spellOnLetter(pc, letter)).filter((p) => Math.abs(p.alter) <= 1);
}

const ACCIDENTAL_ALTER: Record<string, number> = {
  "": 0,
  "#": 1,
  "♯": 1,
  "##": 2,
  x: 2,
  "𝄪": 2,
  b: -1,
  "♭": -1,
  bb: -2,
  "𝄫": -2,
};

const NOTE_NAME = /^([A-G])(##|bb|#|b|♯|♭|x|𝄪|𝄫)?$/u;

/** Parses a bare note name ("F#", "Bb", "E♭", "C"). Returns null for anything else. */
export function parseNoteName(text: string): SpelledPitch | null {
  const match = NOTE_NAME.exec(text);
  if (!match) return null;
  return { letter: match[1] as Letter, alter: ACCIDENTAL_ALTER[match[2] ?? ""] };
}

/** Formats with ASCII accidentals ("#", "b"), matching how the rest of the app writes chords. */
export function formatNoteName(pitch: SpelledPitch): string {
  const accidental = pitch.alter > 0 ? "#".repeat(pitch.alter) : "b".repeat(-pitch.alter);
  return pitch.letter + accidental;
}
