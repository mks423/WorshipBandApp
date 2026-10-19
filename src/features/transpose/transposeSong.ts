import {
  keyChoices,
  keyForPitchClass,
  keyUsesFlats,
  mod,
  parseKey,
  pitchClass,
  transposeChordText,
  type Key,
} from "../../domain/music-theory";
import type { Song } from "../../types/song";
import { isChordToken } from "../chord-scan/chordPattern";
import { guessKeyFromFirstChord } from "./chordTheory";

/**
 * The key the song's chords are written in right now.
 *
 * With a known `originalKey`, that's the original key moved by
 * `transposeSteps` — spelled exactly as given at offset 0 (a chart written
 * in G♭ stays G♭), and conventionally spelled anywhere else, staying on the
 * flat side for a flat-key original. Without one, it falls back to reading
 * the current chords.
 */
export function currentKey(song: Song): Key | null {
  const original = song.originalKey ? parseKey(song.originalKey) : null;
  if (original) return keyAtOffset(original, song.transposeSteps);
  return guessKeyFromFirstChord(song);
}

/**
 * The key the source image is printed in — what a fresh reading of the
 * original chart would be in, regardless of how far the song has since
 * been transposed.
 */
export function printedKey(song: Song): Key | null {
  const original = song.originalKey ? parseKey(song.originalKey) : null;
  if (original) return original;
  const current = guessKeyFromFirstChord(song);
  return current ? keyAtOffset(current, -song.transposeSteps) : null;
}

function keyAtOffset(original: Key, steps: number): Key {
  if (mod(steps, 12) === 0) return original;
  return keyForPitchClass(pitchClass(original.tonic) + steps, original.mode, keyUsesFlats(original));
}

/**
 * Returns a new Song with every chord moved by `semitones` and spelled for
 * the resulting key (G→F turns C into B♭, never A♯), with `transposeSteps`
 * updated to track the total offset from `originalKey`. The source song is
 * left untouched.
 */
export function transposeSong(song: Song, semitones: number): Song {
  if (semitones === 0) return song;

  const moved = { ...song, transposeSteps: song.transposeSteps + semitones };
  const from = currentKey(song);
  // No key at all means no parseable chord anywhere — nothing to rewrite.
  if (!from) return moved;

  const original = song.originalKey ? parseKey(song.originalKey) : null;
  const to = original
    ? keyAtOffset(original, moved.transposeSteps)
    : keyForPitchClass(pitchClass(from.tonic) + semitones, from.mode, keyUsesFlats(from));

  return {
    ...moved,
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        segments: line.segments.map((segment) =>
          // An OCR misread like "Acad" starts with a note letter but isn't a
          // chord; moving just its first letter ("Ccad") would make it look
          // like a real, transposed chord. Leave it exactly as read so the
          // review UI can flag it for the user to fix.
          segment.chord && isChordToken(segment.chord)
            ? { ...segment, chord: transposeChordText(segment.chord, from, to) }
            : segment
        ),
      })),
    })),
  };
}

/**
 * Transposes the song so its key becomes `target` (one of `keyChoicesForSong`).
 * Takes the nearer direction, keeping `transposeSteps` within [-6, 5] of the
 * original instead of letting it grow with every jump.
 */
export function transposeSongToKey(song: Song, target: Key): Song {
  const from = currentKey(song);
  if (!from) return song;
  const forward = mod(pitchClass(target.tonic) - pitchClass(from.tonic), 12);
  const newSteps = mod(song.transposeSteps + forward + 6, 12) - 6;
  return transposeSong(song, newSteps - song.transposeSteps);
}

/** The 12 keys to offer for this song: same mode as its current key, spelled the way `currentKey` will spell them. */
export function keyChoicesForSong(song: Song): Key[] {
  const original = song.originalKey ? parseKey(song.originalKey) : null;
  const reference = original ?? currentKey(song);
  if (!reference) return keyChoices("major");
  return keyChoices(reference.mode, keyUsesFlats(reference)).map((choice) =>
    original && pitchClass(choice.tonic) === pitchClass(original.tonic) ? original : choice
  );
}
