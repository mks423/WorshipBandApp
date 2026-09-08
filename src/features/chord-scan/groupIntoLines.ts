import type { OcrLine, OcrToken } from "./types";

/**
 * Groups loose OCR tokens (as returned by any OCR engine, unordered) into
 * text lines using their vertical position, then sorts tokens left-to-right
 * within each line and lines top-to-bottom.
 *
 * Tokens are clustered by vertical center: a token joins the current line if
 * its center falls within `tolerance` of the running average center for that
 * line, otherwise it starts a new line. `tolerance` defaults to half the
 * median token height, which comfortably separates a chord line from the
 * lyric line directly beneath it on a typical scanned chart while still
 * tolerating the normal jitter of OCR bounding boxes within one printed line.
 */
export function groupTokensIntoLines(tokens: OcrToken[], tolerance?: number): OcrLine[] {
  if (tokens.length === 0) return [];

  const effectiveTolerance = tolerance ?? medianHeight(tokens) * 0.5;

  const sortedByY = [...tokens].sort((a, b) => centerY(a) - centerY(b));

  const lines: { tokens: OcrToken[]; centerSum: number }[] = [];

  for (const token of sortedByY) {
    const y = centerY(token);
    const current = lines[lines.length - 1];
    const currentAvgY = current ? current.centerSum / current.tokens.length : null;

    if (current && currentAvgY !== null && Math.abs(y - currentAvgY) <= effectiveTolerance) {
      current.tokens.push(token);
      current.centerSum += y;
    } else {
      lines.push({ tokens: [token], centerSum: y });
    }
  }

  return lines.map((line) => ({
    tokens: [...line.tokens].sort((a, b) => a.x - b.x),
    y: line.centerSum / line.tokens.length,
  }));
}

function centerY(token: OcrToken): number {
  return token.y + token.height / 2;
}

function medianHeight(tokens: OcrToken[]): number {
  const heights = [...tokens.map((t) => t.height)].sort((a, b) => a - b);
  const mid = Math.floor(heights.length / 2);
  return heights.length % 2 === 0 ? (heights[mid - 1] + heights[mid]) / 2 : heights[mid];
}
