import {
  formatNoteName,
  lineOfFifths,
  mod,
  parseNoteName,
  simpleSpellings,
  type Letter,
  type SpelledPitch,
} from "./pitch";

export type Mode = "major" | "minor";

export interface Key {
  tonic: SpelledPitch;
  mode: Mode;
}

const KEY_TEXT = /^\s*([A-G](?:#|b|♯|♭)?)\s*(m|min|minor|M|maj|major)?\s*$/u;

/** Parses "G", "Bb", "F#m", "E♭ minor", "C major". Returns null for anything else. */
export function parseKey(text: string): Key | null {
  const match = KEY_TEXT.exec(text);
  if (!match) return null;
  const tonic = parseNoteName(match[1]);
  if (!tonic) return null;
  const isMinor = match[2] === "m" || match[2] === "min" || match[2] === "minor";
  return { tonic, mode: isMinor ? "minor" : "major" };
}

/** "Bb", "F#m" — the same compact form chord charts use for keys. */
export function formatKey(key: Key): string {
  return formatNoteName(key.tonic) + (key.mode === "minor" ? "m" : "");
}

/** Key signature as a signed count: +n = n sharps, -n = n flats. */
export function keySignatureFifths(key: Key): number {
  // A minor key shares its signature with the major key a minor third up,
  // which sits three steps clockwise on the line of fifths.
  return lineOfFifths(key.tonic) - (key.mode === "minor" ? 3 : 0);
}

const SHARP_ORDER: Letter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: Letter[] = ["B", "E", "A", "D", "G", "C", "F"];

/** Whether `pitch` is one of the seven notes of `key`'s scale (natural minor for minor keys), spelled as the key spells it. */
export function isDiatonic(pitch: SpelledPitch, key: Key): boolean {
  const fifths = keySignatureFifths(key);
  const altered = fifths >= 0 ? SHARP_ORDER.slice(0, fifths) : FLAT_ORDER.slice(0, -fifths);
  const alterInKey = altered.includes(pitch.letter) ? Math.sign(fifths) : 0;
  return pitch.alter === alterInKey;
}

export function keyUsesFlats(key: Key): boolean {
  return keySignatureFifths(key) < 0;
}

export function keysEqual(a: Key, b: Key): boolean {
  return a.mode === b.mode && a.tonic.letter === b.tonic.letter && a.tonic.alter === b.tonic.alter;
}

/**
 * The conventional spelling of the key whose tonic is pitch class `pc`: the
 * one with the fewest accidentals in its signature (D♭ not C♯, B♭m not A♯m,
 * G♯m not A♭m). The only true ties are six-and-six — F♯/G♭ major and
 * D♯/E♭ minor — and `preferFlat` decides those, so a chart that started in
 * a flat key stays on the flat side.
 */
export function keyForPitchClass(pc: number, mode: Mode, preferFlat = false): Key {
  const candidates = simpleSpellings(mod(pc, 12)).map((tonic): Key => ({ tonic, mode }));
  candidates.sort((a, b) => {
    const diff = Math.abs(keySignatureFifths(a)) - Math.abs(keySignatureFifths(b));
    if (diff !== 0) return diff;
    const aFlat = keyUsesFlats(a) ? 1 : 0;
    const bFlat = keyUsesFlats(b) ? 1 : 0;
    return preferFlat ? bFlat - aFlat : aFlat - bFlat;
  });
  return candidates[0];
}

/** All twelve keys of one mode, conventionally spelled, starting from C. */
export function keyChoices(mode: Mode, preferFlat = false): Key[] {
  return Array.from({ length: 12 }, (_, pc) => keyForPitchClass(pc, mode, preferFlat));
}
