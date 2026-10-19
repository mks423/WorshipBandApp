import { formatNoteName, parseNoteName, type SpelledPitch } from "./pitch";

/**
 * A chord symbol split into the parts transposition needs to touch (root
 * and bass pitch) and the part it must carry through untouched (quality,
 * extensions, alterations — "m7b5", "sus4", "add9", "6/9").
 *
 * Quality is kept as the original text rather than parsed into intervals:
 * transposition never changes it, and keeping it verbatim guarantees a
 * chart's own notation style ("CM7" vs "Cmaj7" vs "CΔ7") survives.
 */
export interface ChordSymbol {
  root: SpelledPitch;
  quality: string;
  bass: SpelledPitch | null;
  /** Anything printed after the bass note (rare; kept so nothing is ever dropped). */
  bassSuffix: string;
}

const ROOT = /^([A-G])(#|b|♯|♭)?/u;
// Greedy `(.*)` binds to the *last* slash, and the bass must start with a
// note letter — so "C6/9" stays a 6/9 chord instead of a C6 over "9".
const SLASH = /^(.*)\/([A-G](?:#|b|♯|♭)?)(.*)$/u;

/** Parses "Am7", "G/B", "C#m7b5", "Bb6/9", "E♭sus4". Returns null if `text` doesn't start with a note (e.g. "N.C.", "%"). */
export function parseChordSymbol(text: string): ChordSymbol | null {
  let head = text;
  let bass: SpelledPitch | null = null;
  let bassSuffix = "";

  const slash = SLASH.exec(text);
  if (slash && ROOT.test(slash[1])) {
    head = slash[1];
    bass = parseNoteName(slash[2]);
    bassSuffix = slash[3];
  }

  const rootMatch = ROOT.exec(head);
  if (!rootMatch) return null;
  const root = parseNoteName(rootMatch[0]);
  if (!root) return null;

  return { root, quality: head.slice(rootMatch[0].length), bass, bassSuffix };
}

export function formatChordSymbol(chord: ChordSymbol): string {
  const main = formatNoteName(chord.root) + chord.quality;
  return chord.bass ? `${main}/${formatNoteName(chord.bass)}${chord.bassSuffix}` : main;
}
