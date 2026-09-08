import type { Song } from "../../types/song";
import { semitonesBetweenKeys, transposeChord } from "./chordTheory";

/**
 * Returns a new Song with every chord shifted by `semitones`, and
 * `transposeSteps` updated to track the total offset from `originalKey`.
 * The source song is left untouched.
 */
export function transposeSong(song: Song, semitones: number): Song {
  if (semitones === 0) return song;

  return {
    ...song,
    transposeSteps: song.transposeSteps + semitones,
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        segments: line.segments.map((segment) =>
          segment.chord ? { ...segment, chord: transposeChord(segment.chord, semitones) } : segment
        ),
      })),
    })),
  };
}

/** Transposes the song so its effective key becomes `targetKey`, from its current transposed key. */
export function transposeSongToKey(song: Song, currentKey: string, targetKey: string): Song {
  return transposeSong(song, semitonesBetweenKeys(currentKey, targetKey));
}
