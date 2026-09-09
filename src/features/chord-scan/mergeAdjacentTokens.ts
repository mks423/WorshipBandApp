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
 *
 * A real Google Vision response for "C#m7" measured the "C"-"#" gap at 0.2x
 * height — narrower glyphs like "#" carry their own side-bearing, so 0.15
 * (tuned against a single earlier chart) missed this on a different chart's
 * font. 0.3 keeps clear of the smallest real word-to-word gap observed on
 * the same chart (~0.86x height), so it can't start bridging actual words.
 */
const MERGE_GAP_TO_HEIGHT_RATIO = 0.3;

/**
 * A parenthesis glyph's own side-bearing (the built-in whitespace baked into
 * the character shape) makes Vision report a noticeably wider pixel gap
 * around "(" / ")" than around ordinary touching characters, even when
 * printed with zero visual space — e.g. real chart output for "B(SUS4)" came
 * back as four tokens "B" / "(" / "SUS4" / ")" with gaps well past the
 * default threshold. A parenthesis attaching to its neighbor is otherwise
 * unambiguous (a real word gap is always much larger still), so it gets a
 * more lenient threshold rather than trying to find one ratio that fits both.
 */
const PAREN_MERGE_GAP_TO_HEIGHT_RATIO = 0.5;

export function mergeAdjacentTokens(line: OcrLine): OcrLine {
  if (line.tokens.length <= 1) return line;

  const merged: OcrToken[] = [line.tokens[0]];

  for (let i = 1; i < line.tokens.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = line.tokens[i];
    const gap = curr.x - (prev.x + prev.width);
    const avgHeight = (prev.height + curr.height) / 2;
    const threshold = touchesParenthesis(prev.text, curr.text)
      ? PAREN_MERGE_GAP_TO_HEIGHT_RATIO
      : MERGE_GAP_TO_HEIGHT_RATIO;

    if (gap < avgHeight * threshold) {
      merged[merged.length - 1] = unionToken(prev, curr);
    } else {
      merged.push(curr);
    }
  }

  return { ...line, tokens: merged };
}

function touchesParenthesis(prevText: string, currText: string): boolean {
  return prevText.endsWith("(") || prevText.endsWith(")") || currText.startsWith("(") || currText.startsWith(")");
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
