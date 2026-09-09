import type { Song } from "../../types/song";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Spellings that don't appear in the canonical name lists but show up on real charts. */
const ENHARMONIC_ALIASES: Record<string, string> = {
  "E#": "F",
  "B#": "C",
  Cb: "B",
  Fb: "E",
};

function noteToIndex(note: string): number {
  const normalized = ENHARMONIC_ALIASES[note] ?? note;
  const sharpIndex = SHARP_NAMES.indexOf(normalized);
  if (sharpIndex !== -1) return sharpIndex;
  const flatIndex = FLAT_NAMES.indexOf(normalized);
  if (flatIndex !== -1) return flatIndex;
  throw new Error(`Unrecognized note: "${note}"`);
}

function indexToNote(index: number, preferFlat: boolean): string {
  const normalizedIndex = ((index % 12) + 12) % 12;
  return preferFlat ? FLAT_NAMES[normalizedIndex] : SHARP_NAMES[normalizedIndex];
}

const NOTE_START = /^([A-G])([#b]?)/;

/**
 * Best-guess original key for a freshly-scanned chart: the root note of its
 * first chord. Worship charts overwhelmingly open on the tonic (the I
 * chord), so this is a simple, usually-correct heuristic rather than real
 * key detection — the user can always retype it if it's wrong for a
 * particular chart.
 */
export function detectOriginalKey(song: Song): string | null {
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const segment of line.segments) {
        if (!segment.chord) continue;
        const match = NOTE_START.exec(segment.chord);
        if (match) return `${match[1]}${match[2]}`;
      }
    }
  }
  return null;
}

function transposeNote(note: string, semitones: number, preferFlat: boolean): string {
  const index = noteToIndex(note);
  return indexToNote(index + semitones, preferFlat);
}

/**
 * Transposes a single chord symbol (e.g. "Am7", "G/B", "C#sus4") by a number
 * of semitones, preserving quality/extension text and the bass note of slash
 * chords. Returns the input unchanged if it isn't a recognizable chord (e.g.
 * "N.C.") so callers can run this over a mix of chord and non-chord text
 * without special-casing.
 *
 * `preferFlat` picks the enharmonic spelling for the result. When omitted it
 * follows the spelling style of the input chord itself (flat in stays flat
 * out), which keeps a chart's accidental style consistent through a
 * transpose.
 */
export function transposeChord(chord: string, semitones: number, preferFlat?: boolean): string {
  if (semitones === 0) return chord;

  const [main, bass] = chord.split("/");
  const match = NOTE_START.exec(main);
  if (!match) return chord;

  const [fullMatch, root, accidental] = match;
  const noteName = `${root}${accidental}`;
  const quality = main.slice(fullMatch.length);
  const flatPreference = preferFlat ?? accidental === "b";

  let result: string;
  try {
    result = transposeNote(noteName, semitones, flatPreference) + quality;
  } catch {
    return chord;
  }

  if (bass) {
    const bassMatch = NOTE_START.exec(bass);
    if (bassMatch) {
      const bassName = `${bassMatch[1]}${bassMatch[2]}`;
      try {
        result += `/${transposeNote(bassName, semitones, flatPreference)}${bass.slice(bassMatch[0].length)}`;
      } catch {
        result += `/${bass}`;
      }
    } else {
      result += `/${bass}`;
    }
  }

  return result;
}

/** Semitone distance to go from `fromKey` to `toKey` (both plain note names like "G", "Bb"), normalized to [0, 11]. */
export function semitonesBetweenKeys(fromKey: string, toKey: string): number {
  return ((noteToIndex(toKey) - noteToIndex(fromKey)) % 12 + 12) % 12;
}
