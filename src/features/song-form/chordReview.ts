import { isDiatonic, keysEqual, parseChordSymbol, transposeChordText, type Key, type SpelledPitch } from "../../domain/music-theory";
import { isChordToken } from "../chord-scan/chordPattern";
import { currentKey, printedKey } from "../transpose";
import type { Segment, Song } from "../../types/song";

/**
 * Why an OCR'd chord needs a human look before anyone plays from it.
 *
 * - "unrecognized": the text doesn't parse as a chord at all ("Acad", "BVE",
 *   "11-Bb") — almost always a misread, and transposition leaves it as-is.
 * - "missing-accidental": a natural root or bass the key itself sharps or
 *   flats — "A/C" in A major, "B" in F major. On real charts this is far
 *   more often OCR dropping a small ♯/♭ than a chromatic chord, and it's
 *   the dangerous kind of misread: it looks like a perfectly valid chord.
 */
export type ChordIssue = "unrecognized" | "missing-accidental";

/** Bar/measure numbers OCR'd on a chord line (e.g. a lone "16") — not chords, so not chord issues either. */
const PURE_NUMBER = /^\d+$/;

/** The song's current key and the key its source image is printed in — they differ once the song is transposed. */
export interface ReviewKeys {
  current: Key | null;
  printed: Key | null;
}

export function reviewKeys(song: Song): ReviewKeys {
  return { current: currentKey(song), printed: printedKey(song) };
}

/**
 * Checks one chord slot. Only OCR output is checked: a segment with no
 * `confidence` was typed or confirmed by the user (editing a chord clears
 * it, see `updateSegment`), and the user's word overrides any heuristic —
 * that's how a real borrowed chord like G in A major gets un-flagged.
 *
 * The accidental check runs on the chord as printed, against the printed
 * key: a dropped ♯ is a fact about the page, so the flag must survive
 * transposition ("A/C" in A becomes "C/Eb" in C, which no longer looks
 * like a bare natural).
 */
export function reviewSegmentChord(segment: Segment, keys: ReviewKeys): ChordIssue | null {
  const chord = segment.chord?.trim();
  if (!chord || segment.confidence === undefined || PURE_NUMBER.test(chord)) return null;
  if (!isChordToken(chord)) return "unrecognized";

  const { current, printed } = keys;
  if (!printed) return null;
  const asPrinted = current && !keysEqual(current, printed) ? transposeChordText(chord, current, printed) : chord;
  const parsed = parseChordSymbol(asPrinted);
  if (!parsed) return null;
  const suspicious = (pitch: SpelledPitch) =>
    pitch.alter === 0 &&
    !isDiatonic(pitch, printed) &&
    (isDiatonic({ ...pitch, alter: 1 }, printed) || isDiatonic({ ...pitch, alter: -1 }, printed));
  return suspicious(parsed.root) || (parsed.bass !== null && suspicious(parsed.bass)) ? "missing-accidental" : null;
}

/** How many chord slots on the song still need review. */
export function countChordIssues(song: Song): number {
  const keys = reviewKeys(song);
  let count = 0;
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const segment of line.segments) {
        if (reviewSegmentChord(segment, keys)) count += 1;
      }
    }
  }
  return count;
}
