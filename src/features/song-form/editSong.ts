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

/** Appends a new Verse/Chorus/Bridge-style label to the end of the song's structure. The same label can be added more than once (e.g. a song with two Chorus sections). */
export function addSectionMarker(song: Song, label: string): Song {
  const marker: SectionMarker = { id: createId("marker"), label };
  return { ...song, sectionMarkers: [...song.sectionMarkers, marker] };
}

/** Renames an existing section marker. */
export function updateSectionMarker(song: Song, markerId: string, changes: Partial<Pick<SectionMarker, "label">>): Song {
  return {
    ...song,
    sectionMarkers: song.sectionMarkers.map((marker) => (marker.id === markerId ? { ...marker, ...changes } : marker)),
  };
}

export function removeSectionMarker(song: Song, markerId: string): Song {
  return { ...song, sectionMarkers: song.sectionMarkers.filter((marker) => marker.id !== markerId) };
}

/**
 * Moves a section marker one spot earlier (-1) or later (+1) in the song's
 * structure. The array order *is* the performance order — there's no
 * separate position to derive it from — so reordering is a plain adjacent
 * swap. A no-op past either end.
 */
export function moveSectionMarker(song: Song, markerId: string, direction: -1 | 1): Song {
  const index = song.sectionMarkers.findIndex((marker) => marker.id === markerId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= song.sectionMarkers.length) return song;

  const markers = [...song.sectionMarkers];
  [markers[index], markers[target]] = [markers[target], markers[index]];
  return { ...song, sectionMarkers: markers };
}
