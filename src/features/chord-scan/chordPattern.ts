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
 */

const NOTE = "[A-G](?:#|b)?";
const QUALITY = "(?:maj|min|dim|aug|sus|m)?";
const EXTENSION = "(?:2|4|5|6|7|9|11|13)?";
const ALTERATION = "(?:[#b](?:5|9|11|13))?";
const ADD = "(?:add(?:2|4|9|11|13))?";
const BASS = `(?:/${NOTE})?`;

const CHORD_REGEX = new RegExp(`^${NOTE}${QUALITY}${EXTENSION}${ALTERATION}${ADD}${BASS}$`);

const NO_CHORD_REGEX = /^(N\.?C\.?|%)$/;

export function isChordToken(rawText: string): boolean {
  const token = rawText.trim();
  if (!token) return false;
  if (NO_CHORD_REGEX.test(token)) return true;
  return CHORD_REGEX.test(token);
}
