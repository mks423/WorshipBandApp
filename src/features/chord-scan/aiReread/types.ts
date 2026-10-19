/**
 * Provider-agnostic shapes for asking a vision model to re-read chords OCR
 * got wrong. The review UI only depends on these, never on a specific SDK,
 * so the model provider (or a server proxy in front of it) can be swapped
 * without touching screens.
 */

export type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface RereadItem {
  /** Our segment id — the model must answer with exactly these ids, so it can't add chords of its own. */
  id: string;
  /** Where OCR found the text, in source-image pixels. */
  bbox: { x: number; y: number; width: number; height: number };
  /** What OCR read there, if it's still the original reading (null once the song has been transposed). */
  ocrText: string | null;
}

export interface RereadRequest {
  image: { base64: string; mediaType: ImageMediaType; width: number; height: number };
  /** The chart's printed key, e.g. "A", "F#m" — context for reading accidentals, not for guessing. */
  printedKey: string | null;
  items: RereadItem[];
}

export type RereadResult =
  /** One or more chords printed at that spot (more than one when OCR glued neighbors together). */
  | { id: string; kind: "chords"; chords: string[]; confident: boolean }
  /** Not a chord at all — a volta number, measure number, stray mark. */
  | { id: string; kind: "not_chord"; confident: boolean }
  /** The model couldn't read it either. */
  | { id: string; kind: "unsure" };

export interface ChordRereader {
  reread(request: RereadRequest): Promise<RereadResult[]>;
}
