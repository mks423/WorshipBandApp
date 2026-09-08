import {
  createLine,
  createSection,
  createSegment,
  type Line,
  type Section,
  type Segment,
  type Song,
} from "../../types/song";

/** Identifies a single segment within a song, for edit operations below. */
export interface SegmentLocation {
  sectionId: string;
  lineId: string;
  segmentId: string;
}

/**
 * Pure, immutable editing operations over the Song model. These are the
 * building blocks a review/edit UI calls after OCR produces a draft (or when
 * a song is authored by hand): correcting a misread chord or lyric,
 * reclassifying a segment, splitting one segment into two, or restructuring
 * sections and lines. Each function returns a new Song; the input is never
 * mutated, so they drop directly into any state layer (useState/useReducer,
 * Zustand, Redux, ...) the app ends up using.
 */

function updateSection(song: Song, sectionId: string, updater: (section: Section) => Section): Song {
  return {
    ...song,
    sections: song.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
  };
}

function updateLine(song: Song, sectionId: string, lineId: string, updater: (line: Line) => Line): Song {
  return updateSection(song, sectionId, (section) => ({
    ...section,
    lines: section.lines.map((line) => (line.id === lineId ? updater(line) : line)),
  }));
}

/** Edits a segment's chord and/or lyric text in place. Pass `chord: null` to reclassify it as a plain lyric segment. */
export function updateSegment(
  song: Song,
  location: SegmentLocation,
  changes: Partial<Pick<Segment, "chord" | "lyric">>
): Song {
  return updateLine(song, location.sectionId, location.lineId, (line) => ({
    ...line,
    segments: line.segments.map((segment) =>
      segment.id === location.segmentId ? { ...segment, ...changes, confidence: undefined } : segment
    ),
  }));
}

/**
 * Splits a segment's lyric text at `atCharIndex` into two segments: the
 * first keeps the original chord, the second has no chord (plain lyric).
 * Useful when OCR merges two words that should each carry their own chord,
 * or the alignment attached a chord to the wrong word boundary.
 */
export function splitSegment(song: Song, location: SegmentLocation, atCharIndex: number): Song {
  return updateLine(song, location.sectionId, location.lineId, (line) => {
    const index = line.segments.findIndex((s) => s.id === location.segmentId);
    if (index === -1) return line;

    const segment = line.segments[index];
    const clampedIndex = Math.max(0, Math.min(atCharIndex, segment.lyric.length));
    const before = createSegment({ chord: segment.chord, lyric: segment.lyric.slice(0, clampedIndex) });
    const after = createSegment({ chord: null, lyric: segment.lyric.slice(clampedIndex) });

    const segments = [...line.segments];
    segments.splice(index, 1, before, after);
    return { ...line, segments };
  });
}

/** Merges a segment with the one immediately after it in the same line, concatenating their lyrics and keeping the first segment's chord. */
export function mergeSegmentWithNext(song: Song, location: SegmentLocation): Song {
  return updateLine(song, location.sectionId, location.lineId, (line) => {
    const index = line.segments.findIndex((s) => s.id === location.segmentId);
    if (index === -1 || index === line.segments.length - 1) return line;

    const current = line.segments[index];
    const next = line.segments[index + 1];
    const merged = createSegment({ chord: current.chord, lyric: current.lyric + next.lyric });

    const segments = [...line.segments];
    segments.splice(index, 2, merged);
    return { ...line, segments };
  });
}

export function removeSegment(song: Song, location: SegmentLocation): Song {
  return updateLine(song, location.sectionId, location.lineId, (line) => ({
    ...line,
    segments: line.segments.filter((s) => s.id !== location.segmentId),
  }));
}

export function insertSegmentAfter(
  song: Song,
  location: SegmentLocation,
  newSegment: Partial<Segment> & { lyric: string }
): Song {
  return updateLine(song, location.sectionId, location.lineId, (line) => {
    const index = line.segments.findIndex((s) => s.id === location.segmentId);
    if (index === -1) return line;
    const segments = [...line.segments];
    segments.splice(index + 1, 0, createSegment(newSegment));
    return { ...line, segments };
  });
}

export function renameSection(song: Song, sectionId: string, name: string): Song {
  return updateSection(song, sectionId, (section) => ({ ...section, name }));
}

export function addSection(song: Song, name: string, afterSectionId?: string): Song {
  const newSection = createSection(name);
  if (!afterSectionId) {
    return { ...song, sections: [...song.sections, newSection] };
  }
  const index = song.sections.findIndex((s) => s.id === afterSectionId);
  if (index === -1) return { ...song, sections: [...song.sections, newSection] };
  const sections = [...song.sections];
  sections.splice(index + 1, 0, newSection);
  return { ...song, sections };
}

export function removeSection(song: Song, sectionId: string): Song {
  return { ...song, sections: song.sections.filter((s) => s.id !== sectionId) };
}

export function addLine(song: Song, sectionId: string, afterLineId?: string): Song {
  return updateSection(song, sectionId, (section) => {
    const newLine = createLine([createSegment({ chord: null, lyric: "" })]);
    if (!afterLineId) return { ...section, lines: [...section.lines, newLine] };
    const index = section.lines.findIndex((l) => l.id === afterLineId);
    if (index === -1) return { ...section, lines: [...section.lines, newLine] };
    const lines = [...section.lines];
    lines.splice(index + 1, 0, newLine);
    return { ...section, lines };
  });
}

export function removeLine(song: Song, sectionId: string, lineId: string): Song {
  return updateSection(song, sectionId, (section) => ({
    ...section,
    lines: section.lines.filter((l) => l.id !== lineId),
  }));
}
