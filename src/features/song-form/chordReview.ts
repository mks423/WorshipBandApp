import { isDiatonic, parseChordSymbol, type Key, type SpelledPitch } from "../../domain/music-theory";
import { isChordToken } from "../chord-scan/chordPattern";
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

/**
 * Checks one chord slot. Only OCR output is checked: a segment with no
 * `confidence` was typed or confirmed by the user (editing a chord clears
 * it, see `updateSegment`), and the user's word overrides any heuristic —
 * that's how a real borrowed chord like G in A major gets un-flagged.
 */
export function reviewSegmentChord(segment: Segment, key: Key | null): ChordIssue | null {
  const chord = segment.chord?.trim();
  if (!chord || segment.confidence === undefined || PURE_NUMBER.test(chord)) return null;
  if (!isChordToken(chord)) return "unrecognized";

  const parsed = parseChordSymbol(chord);
  if (!parsed || !key) return null;
  const suspicious = (pitch: SpelledPitch) =>
    pitch.alter === 0 &&
    !isDiatonic(pitch, key) &&
    (isDiatonic({ ...pitch, alter: 1 }, key) || isDiatonic({ ...pitch, alter: -1 }, key));
  return suspicious(parsed.root) || (parsed.bass !== null && suspicious(parsed.bass)) ? "missing-accidental" : null;
}

/** How many chord slots on the song still need review. */
export function countChordIssues(song: Song, key: Key | null): number {
  let count = 0;
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const segment of line.segments) {
        if (reviewSegmentChord(segment, key)) count += 1;
      }
    }
  }
  return count;
}

export const CHORD_ISSUE_LABEL: Record<ChordIssue, string> = {
  unrecognized: "코드로 읽히지 않음",
  "missing-accidental": "♯/♭ 누락 의심",
};
