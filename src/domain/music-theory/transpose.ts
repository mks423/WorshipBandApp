import { formatChordSymbol, parseChordSymbol, type ChordSymbol } from "./chord";
import { isDiatonic, keyUsesFlats, type Key } from "./key";
import {
  LETTERS,
  letterIndex,
  mod,
  pitchClass,
  simpleSpellings,
  spellOnLetter,
  type SpelledPitch,
} from "./pitch";

/**
 * A transposition measured the way a musician thinks of it: how many letter
 * names to move (the diatonic step) *and* how many semitones. G→F is "down a
 * step, down two semitones", which is why its C chord lands on B♭ — moving
 * the letter C down one step gives B, and two semitones below C is B♭.
 * Semitones alone can't tell B♭ from A♯.
 */
export interface KeyInterval {
  /** Letter steps upward, in [0, 6]. */
  letterSteps: number;
  /** Semitones upward, in [0, 11]. */
  semitones: number;
}

export function intervalBetweenKeys(from: Key, to: Key): KeyInterval {
  return {
    letterSteps: mod(letterIndex(to.tonic.letter) - letterIndex(from.tonic.letter), 7),
    semitones: mod(pitchClass(to.tonic) - pitchClass(from.tonic), 12),
  };
}

/**
 * Moves one pitch by `interval` into key `to`. Diatonic pitches always come
 * out spelled as the target key's own scale degree. Chromatic pitches keep
 * their letter-based spelling, with two cleanups:
 *
 * - A double accidental (e.g. an A♯ passing chord moved into a sharp key) is
 *   respelled to the simplest enharmonic, leaning toward the target key's
 *   side of the circle so a flat key doesn't suddenly sprout sharps.
 * - E♯, B♯, C♭ and F♭ are respelled as the plain white key unless the target
 *   key actually uses them (F♯ major's E♯, G♭ major's C♭). This also
 *   repairs charts saved by the old semitone transposer, whose "A#" in F
 *   would otherwise become "B#" in G.
 */
export function transposePitch(pitch: SpelledPitch, interval: KeyInterval, to: Key): SpelledPitch {
  const letter = LETTERS[mod(letterIndex(pitch.letter) + interval.letterSteps, 7)];
  const pc = mod(pitchClass(pitch) + interval.semitones, 12);
  const spelled = spellOnLetter(pc, letter);
  const options = simpleSpellings(pc);
  const natural = options.find((p) => p.alter === 0);

  if (Math.abs(spelled.alter) > 1) {
    return natural ?? options.find((p) => p.alter === (keyUsesFlats(to) ? -1 : 1)) ?? options[0];
  }
  if (natural && spelled.alter !== 0 && !isDiatonic(spelled, to)) return natural;
  return spelled;
}

export function transposeChordSymbol(chord: ChordSymbol, from: Key, to: Key): ChordSymbol {
  const interval = intervalBetweenKeys(from, to);
  return {
    ...chord,
    root: transposePitch(chord.root, interval, to),
    bass: chord.bass ? transposePitch(chord.bass, interval, to) : null,
  };
}

/**
 * Transposes chord text written in `from` so it reads correctly in `to`.
 * Text that isn't a chord (e.g. "N.C.", "%") is returned unchanged, so this
 * can be run over every chord slot on a chart without special-casing.
 */
export function transposeChordText(text: string, from: Key, to: Key): string {
  const chord = parseChordSymbol(text);
  if (!chord) return text;
  return formatChordSymbol(transposeChordSymbol(chord, from, to));
}
