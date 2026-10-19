import { formatKey, mod, parseChordSymbol, parseKey, pitchClass, type Key } from "../../domain/music-theory";
import type { Song } from "../../types/song";

/** Quality text that marks a minor triad/seventh ("m", "m7", "min", "-7"), but not a major-seventh "maj7"/"M7". */
const MINOR_QUALITY = /^(m(?!aj)|min|-)/;

/**
 * Best-guess original key for a freshly-scanned chart, as a key name ("G",
 * "Em"): the first chord, read as a tonic. Worship charts overwhelmingly
 * open on the tonic (the I or i chord), so this is a simple, usually-correct
 * heuristic rather than real key detection — the user can always retype it
 * if it's wrong for a particular chart.
 */
export function detectOriginalKey(song: Song): string | null {
  const key = guessKeyFromFirstChord(song);
  return key ? formatKey(key) : null;
}

/** Same guess as `detectOriginalKey`, as a structured Key. */
export function guessKeyFromFirstChord(song: Song): Key | null {
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const segment of line.segments) {
        if (!segment.chord) continue;
        const chord = parseChordSymbol(segment.chord);
        if (chord) return { tonic: chord.root, mode: MINOR_QUALITY.test(chord.quality) ? "minor" : "major" };
      }
    }
  }
  return null;
}

/** Semitone distance to go from `fromKey` to `toKey` (key names like "G", "Bb", "F#m"), normalized to [0, 11]. */
export function semitonesBetweenKeys(fromKey: string, toKey: string): number {
  const from = parseKey(fromKey);
  const to = parseKey(toKey);
  if (!from || !to) throw new Error(`Unrecognized key: "${from ? toKey : fromKey}"`);
  return mod(pitchClass(to.tonic) - pitchClass(from.tonic), 12);
}
