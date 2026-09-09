/**
 * Core song data model.
 *
 * A song is broken into sections (Verse 1, Chorus, ...), each made of lines,
 * each line made of segments. A segment pairs an optional chord with the
 * lyric text it sits above, e.g. the line "Amazing grace how sweet the sound"
 * with chords G and C becomes:
 *   [{ chord: "G", lyric: "Amazing " }, { chord: "C", lyric: "grace how sweet the sound" }]
 *
 * This shape mirrors how chords are visually anchored to a word start on a
 * scanned chart, so it maps directly onto OCR token positions, and it
 * serializes losslessly to inline chord notation ("[G]Amazing [C]grace...").
 */

export interface Segment {
  id: string;
  /** Chord symbol anchored at the start of this segment (e.g. "G", "Am7", "C/E"), or null for plain lyric. */
  chord: string | null;
  /** Lyric text this segment covers. Can be an empty string for a chord with no lyric under it (e.g. an instrumental hit). */
  lyric: string;
  /**
   * Confidence that this segment's chord/lyric split and chord-vs-lyric
   * classification are correct, in [0, 1]. Undefined means "not from an
   * automated source" (e.g. typed in by hand), which the editor treats as
   * fully trusted. Segments from OCR carry a score so the editor can flag
   * low-confidence ones for the user to review.
   */
  confidence?: number;
  /**
   * Where this segment's chord was printed on the original scanned image
   * (pixel coordinates in `Song.sourceImage`'s space), if this segment came
   * from OCR. Lets a "view on original" screen redraw the (possibly edited
   * or transposed) chord text directly over the spot it was recognized at.
   * Undefined for hand-entered segments or ones with no chord.
   */
  chordPosition?: { x: number; y: number; width: number; height: number };
}

export interface Line {
  id: string;
  segments: Segment[];
}

export interface Section {
  id: string;
  /** e.g. "Verse 1", "Chorus", "Bridge", "Intro" */
  name: string;
  lines: Line[];
}

/** A Verse/Chorus/Bridge-style tag placed at a point on the source image, marking where that part of the chart starts. */
export interface SectionMarker {
  id: string;
  /** e.g. "Verse 1", "Chorus", "Bridge" — picked from a preset list or typed in by hand. */
  label: string;
  /** Position on the source image (pixel coordinates in `Song.sourceImage`'s space) where this section starts. */
  x: number;
  y: number;
}

export interface Song {
  id: string;
  title: string;
  /** Original key the chart was written in, e.g. "G". Null if unknown/unset. */
  originalKey: string | null;
  /** Semitone offset currently applied relative to originalKey (0 = original key). */
  transposeSteps: number;
  /** Tempo in beats per minute, for set-time planning and (eventually) playback. Null if unknown/unset. */
  bpm: number | null;
  /** Freeform notes for this song — a sermon theme, talking points, anything worth remembering alongside the chart. */
  notes: string;
  sections: Section[];
  /** Verse/Chorus/Bridge-style tags placed on the source image, independent of the OCR'd `sections` grouping. */
  sectionMarkers: SectionMarker[];
  /** The scanned image this song was built from, if any, for the "view on original" overlay screen. */
  sourceImage?: { uri: string; width: number; height: number };
  /** Id shared by every page of the same imported document (e.g. a multi-page PDF), so the library can show them as one entry and reopen them together. Undefined for a single-page scan or a hand-entered song. */
  groupId?: string;
  /** 1-based position within `groupId`'s pages, for sort order and page-flip navigation. Undefined when `groupId` is. */
  pageNumber?: number;
}

let idCounter = 0;

/** Generates a short, collision-safe-enough id for song model nodes within a session. */
export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function createSegment(partial: Partial<Segment> & { lyric: string }): Segment {
  return {
    id: createId("seg"),
    chord: null,
    ...partial,
  };
}

export function createLine(segments: Segment[] = []): Line {
  return { id: createId("line"), segments };
}

export function createSection(name: string, lines: Line[] = []): Section {
  return { id: createId("section"), name, lines };
}

export function createEmptySong(title: string): Song {
  return {
    id: createId("song"),
    title,
    originalKey: null,
    transposeSteps: 0,
    bpm: null,
    notes: "",
    sections: [],
    sectionMarkers: [],
  };
}
