import {
  createId,
  createLine,
  createSection,
  createSegment,
  type Line,
  type Section,
  type Segment,
  type SectionMarker,
  type Song,
} from "../../types/song";

/** Identifies a single segment within a song, for edit operations below. */
export interface SegmentLocation {
  sectionId: string;
  lineId: string;
  segmentId: string;
}

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

/** Moves a chord's badge to a new pixel position on the source image (e.g. after dragging it to correct a misaligned OCR position). */
export function moveChord(
  song: Song,
  location: SegmentLocation,
  position: NonNullable<Segment["chordPosition"]>
): Song {
  return updateLine(song, location.sectionId, location.lineId, (line) => ({
    ...line,
    segments: line.segments.map((segment) =>
      segment.id === location.segmentId ? { ...segment, chordPosition: position } : segment
    ),
  }));
}

/**
 * Adds a brand-new chord at an arbitrary point on the chart, for a chord OCR
 * missed entirely. Chords are only ever shown positioned on the source image
 * now (there's no running-text view left to slot into), so this doesn't need
 * to land in any particular spot in the lyric flow — it's simply appended as
 * its own line in the last section, which is enough for it to participate in
 * transpose and tap-to-edit exactly like an OCR'd chord.
 */
export function addChord(song: Song, position: NonNullable<Segment["chordPosition"]>, chord: string): Song {
  const newLine = createLine([createSegment({ chord, lyric: "", chordPosition: position })]);

  if (song.sections.length === 0) {
    return { ...song, sections: [createSection("Verse 1", [newLine])] };
  }

  const lastIndex = song.sections.length - 1;
  return {
    ...song,
    sections: song.sections.map((section, i) =>
      i === lastIndex ? { ...section, lines: [...section.lines, newLine] } : section
    ),
  };
}

/** Places a new Verse/Chorus/Bridge-style label at a point on the source image. */
export function addSectionMarker(song: Song, position: { x: number; y: number }, label: string): Song {
  const marker: SectionMarker = { id: createId("marker"), label, x: position.x, y: position.y };
  return { ...song, sectionMarkers: [...song.sectionMarkers, marker] };
}

/** Edits an existing section marker's label and/or position. */
export function updateSectionMarker(
  song: Song,
  markerId: string,
  changes: Partial<Pick<SectionMarker, "label" | "x" | "y">>
): Song {
  return {
    ...song,
    sectionMarkers: song.sectionMarkers.map((marker) => (marker.id === markerId ? { ...marker, ...changes } : marker)),
  };
}

export function removeSectionMarker(song: Song, markerId: string): Song {
  return { ...song, sectionMarkers: song.sectionMarkers.filter((marker) => marker.id !== markerId) };
}
