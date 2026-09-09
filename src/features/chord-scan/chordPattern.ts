/**
 * Recognizes whether a single OCR token text looks like a chord symbol
 * (e.g. "G", "Am7", "C#m7b5", "G/B", "Csus4") as opposed to a lyric word.
 *
 * Chord notation is fairly rigid, so a grammar-shaped regex catches the
 * overwhelming majority of real charts. This intentionally only judges one
 * token at a time; line-level classification (see classifyLines.ts) is what
 * actually decides chord-line vs lyric-line, using the ratio of matching
 * tokens so a stray word that happens to match (e.g. lyric "a") doesn't
 * misclassify a whole line.
 *
 * This grammar is deliberately strict (a full match, not just "starts with a
 * note letter"), even though transposeChord (chordTheory.ts) only ever needs
 * the leading note letter and carries everything else through unchanged.
 * That's because this function serves a different purpose: classifyLines.ts
 * uses it to tell a chord line from a lyric line by what fraction of a
 * line's tokens look chord-like. If this matched anything starting with
 * A-G, most lyric lines would score as chord lines too — worship lyrics are
 * full of English/Latin words starting with a note letter ("Amazing",
 * "God", "Come", "Great", "Emmanuel"...).
 */

const NOTE = "[A-G](?:#|b)?";
// "M" (capital) is a distinct, deliberate alternative to "m" (minor) — real
// charts use it for a bare major-seventh marker (e.g. "CM7", "DM7"), and
// collapsing the two would erase a real harmonic distinction. "Δ" (delta) is
// jazz-chart shorthand for the same major marker. "ø"/"Ø" (half-diminished)
// and "°" (fully diminished) are the symbol forms of "m7b5" and "dim" some
// charts use instead of spelling them out. "+" and "-" are older jazz-chart
// shorthand for augmented and minor (e.g. "C+", "C-7").
const QUALITY = "(?:maj|min|dim|aug|sus|M|m|Δ|ø|Ø|°|\\+|-)?";
// "6/9" is a combined-extension chord (e.g. "C6/9"), listed before the bare
// digits so a token like "C6/9" doesn't get read as extension "6" with a
// (nonsensical) "/9" bass.
const EXTENSION = "(?:6/9|2|4|5|6|7|9|11|13)?";
// Tone-omission notation (e.g. "Ano3" = an A chord voiced without the 3rd —
// not "no 3", it means "3rd omitted"), seen on real arranger-annotated
// worship charts. Repeatable since a chart can omit more than one tone at
// once (e.g. "Ano3no5").
const TONE_OMIT = "(?:no(?:3|5|7|9))*";
const ALTERATION = "(?:[#b+-](?:5|9|11|13))?";
const ADD = "(?:add(?:2|4|9|11|13))?";
const BASS = `(?:/${NOTE})?`;

const CHORD_REGEX = new RegExp(`^${NOTE}${QUALITY}${EXTENSION}${TONE_OMIT}${ALTERATION}${ADD}${BASS}$`);

const NO_CHORD_REGEX = /^(N\.?C\.?|%)$/;

/** Unicode superscript digits some chord-chart typesetting uses for extensions (e.g. "C⁷"). */
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** Full-width digits some CJK-aware chart typesetting/fonts use (e.g. "C７"). */
const FULLWIDTH_DIGITS: Record<string, string> = {
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
};

/**
 * Normalizes real-world spelling variance that the strict grammar above
 * would otherwise reject outright, without touching the note letter or the
 * meaningful "m" vs "M" distinction:
 * - Drops incidental whitespace a noisy OCR merge can leave inside one
 *   logical token (e.g. "B ( SUS4 )").
 * - Strips parentheses/brackets some chart software wraps around the
 *   quality/extension (e.g. "B(SUS4)", "Db7(#11)", "C#m7(b5)") or around a
 *   bracketed cue-chord group (e.g. "(Em7" / "C)") — both the ASCII and the
 *   full-width CJK forms some Korean-typeset charts use.
 * - Lowercases word-based qualities regardless of how they were cased
 *   ("SUS4" / "Sus4" / "sus4" all mean the same thing).
 * - Converts Unicode superscript and full-width digits to plain ASCII
 *   digits.
 */
function normalizeChordCandidate(token: string): string {
  return token
    .replace(/\s+/g, "")
    .replace(/[()\[\]（）]/g, "")
    .replace(/(maj|min|dim|aug|sus|add|no)/gi, (word) => word.toLowerCase())
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (digit) => SUPERSCRIPT_DIGITS[digit] ?? digit)
    .replace(/[０-９]/g, (digit) => FULLWIDTH_DIGITS[digit] ?? digit);
}

export function isChordToken(rawText: string): boolean {
  const token = rawText.trim();
  if (!token) return false;
  if (NO_CHORD_REGEX.test(token)) return true;
  return CHORD_REGEX.test(normalizeChordCandidate(token));
}

/**
 * Attempts to split one OCR token that reads as two chords glued together
 * with no visual gap (common when a chart packs multiple chords tightly on
 * one beat, e.g. "Am7G/B" or "C#m7C") into its separate chord symbols.
 *
 * Only ever splits into pieces that are *each* independently a valid chord,
 * so it can't corrupt an ordinary lyric word: an English word essentially
 * never has a prefix and suffix that both parse as chord grammar (both
 * halves would need to start with a bare note letter A-G).
 */
export function splitGluedChordToken(text: string): string[] {
  if (isChordToken(text)) return [text];
  for (let i = 1; i < text.length; i++) {
    const left = text.slice(0, i);
    const right = text.slice(i);
    if (isChordToken(left) && isChordToken(right)) {
      return [left, right];
    }
  }
  return [text];
}
