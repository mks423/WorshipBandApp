import { isChordToken } from "./chordPattern";
import type { ClassifiedLine, OcrLine } from "./types";

/** A line counts as a "chord line" once at least this fraction of its tokens look like chord symbols. */
export const CHORD_LINE_RATIO_THRESHOLD = 0.6;

const SECTION_KEYWORDS =
  /^(verse|chorus|bridge|intro|outro|pre-?chorus|interlude|tag|ending|refrain|hook|vamp)\s*\d*[:.]?$/i;

/**
 * Classifies each OCR-derived line as a chord line, a lyric line, a section
 * label (e.g. "Verse 1", "Chorus"), or blank. This only looks at each line in
 * isolation; buildSongFromOcr.ts is what stitches classified lines together
 * into the song structure (e.g. pairing a chord line with the lyric line
 * beneath it).
 */
export function classifyLines(lines: OcrLine[]): ClassifiedLine[] {
  return lines.map((line) => {
    if (line.tokens.length === 0) {
      return { ...line, type: "blank", chordTokenRatio: 0 };
    }

    const lineText = line.tokens.map((t) => t.text).join(" ").trim();
    if (line.tokens.length <= 2 && SECTION_KEYWORDS.test(lineText)) {
      return { ...line, type: "section", chordTokenRatio: 0 };
    }

    const chordTokenCount = line.tokens.filter((t) => isChordToken(t.text)).length;
    const chordTokenRatio = chordTokenCount / line.tokens.length;

    return {
      ...line,
      type: chordTokenRatio >= CHORD_LINE_RATIO_THRESHOLD ? "chord" : "lyric",
      chordTokenRatio,
    };
  });
}
