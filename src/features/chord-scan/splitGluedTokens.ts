import { splitGluedChordToken } from "./chordPattern";
import type { OcrLine, OcrToken } from "./types";

/**
 * Runs splitGluedChordToken over every token on a line, expanding any token
 * that turns out to be two chords glued together (e.g. "Am7G/B") into two
 * separate tokens. Each piece gets an estimated bounding box — width split
 * proportionally by character count, same y/height as the original — good
 * enough for chord/lyric alignment even though it isn't the real OCR box.
 *
 * Intended to run on each line's tokens (already x-sorted and merged by
 * mergeAdjacentTokens) right before classification, so a glued pair counts
 * as two chord tokens rather than one unrecognizable one.
 */
export function splitGluedTokensOnLine(line: OcrLine): OcrLine {
  const tokens = line.tokens.flatMap(splitGluedToken);
  return { ...line, tokens };
}

function splitGluedToken(token: OcrToken): OcrToken[] {
  const pieces = splitGluedChordToken(token.text);
  if (pieces.length === 1) return [token];

  const totalChars = pieces.reduce((sum, piece) => sum + piece.length, 0);
  let xCursor = token.x;

  return pieces.map((text) => {
    const width = (text.length / totalChars) * token.width;
    const piece: OcrToken = { text, x: xCursor, y: token.y, width, height: token.height };
    xCursor += width;
    return piece;
  });
}
