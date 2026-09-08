import type { OcrLine, OcrToken } from "./types";

/**
 * Real-world OCR (Google Vision included) sometimes splits one printed
 * symbol into multiple tokens when characters are tightly kerned — most
 * commonly an accidental glued to its note letter, e.g. "F#m7" comes back
 * as three separate tokens: "F", "#", "m7". Left alone, none of those
 * fragments individually looks like a chord, which corrupts both line
 * classification and chord/lyric alignment.
 *
 * This glues back together any run of tokens on the same line whose
 * horizontal gap is much smaller than the normal space between words —
 * i.e. touching or nearly-touching characters, not two separate words.
 * Intended to run on each line's tokens (already x-sorted) right after
 * groupTokensIntoLines, before classification.
 */
const MERGE_GAP_TO_HEIGHT_RATIO = 0.15;

export function mergeAdjacentTokens(line: OcrLine): OcrLine {
  if (line.tokens.length <= 1) return line;

  const merged: OcrToken[] = [line.tokens[0]];

  for (let i = 1; i < line.tokens.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = line.tokens[i];
    const gap = curr.x - (prev.x + prev.width);
    const avgHeight = (prev.height + curr.height) / 2;

    if (gap < avgHeight * MERGE_GAP_TO_HEIGHT_RATIO) {
      merged[merged.length - 1] = unionToken(prev, curr);
    } else {
      merged.push(curr);
    }
  }

  return { ...line, tokens: merged };
}

function unionToken(a: OcrToken, b: OcrToken): OcrToken {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    text: a.text + b.text,
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}
