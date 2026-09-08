/**
 * Provider-agnostic OCR shapes. Any OCR engine (cloud API, on-device ML Kit,
 * Vision framework, etc.) can be adapted into this shape; the classification
 * pipeline below only depends on these types, never on a specific SDK.
 */

export interface OcrToken {
  text: string;
  /** Bounding box in image pixel coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LineType = "chord" | "lyric" | "section" | "blank";

export interface OcrLine {
  tokens: OcrToken[];
  /** Vertical center of the line, used for ordering and chord/lyric pairing. */
  y: number;
}

export interface ClassifiedLine extends OcrLine {
  type: LineType;
  /** Fraction of tokens on this line that look like chord symbols, in [0, 1]. */
  chordTokenRatio: number;
}
