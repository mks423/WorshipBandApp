import { repairMisreadChord } from "./chordPattern";
import type { OcrLine } from "./types";

/**
 * Runs repairMisreadChord over every token on a line, fixing single-character
 * OCR misreads that would otherwise make an intended chord unrecognizable
 * (e.g. "8m7" -> "Bm7"). Only the token's text changes; its bounding box is
 * left untouched since the correction doesn't change how many characters are
 * visually there.
 *
 * Intended to run right after splitGluedTokensOnLine and before
 * classification, so a repaired token also counts correctly toward a line's
 * chord-token ratio.
 */
export function repairMisreadTokensOnLine(line: OcrLine): OcrLine {
  return { ...line, tokens: line.tokens.map((token) => ({ ...token, text: repairMisreadChord(token.text) })) };
}
