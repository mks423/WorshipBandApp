import { formatKey, keysEqual, transposeChordText } from "../../domain/music-theory";
import { isChordToken } from "../chord-scan/chordPattern";
import type { RereadItem, RereadResult } from "../chord-scan/aiReread/types";
import { currentKey, printedKey } from "../transpose";
import type { Segment, Song } from "../../types/song";
import { reviewKeys, reviewSegmentChord } from "./chordReview";
import { addChord, moveChord, updateSegment, type SegmentLocation } from "./editSong";

/**
 * What the AI proposes for one flagged chord slot. Never applied on its own:
 * the overlay shows it, and only the user's tap writes it into the song.
 * Chords are already moved into the song's current key.
 */
export type ChordSuggestion =
  | { kind: "replace"; chords: string[]; confident: boolean }
  | { kind: "remove"; confident: boolean };

interface FlaggedSlot {
  segment: Segment & { chordPosition: NonNullable<Segment["chordPosition"]> };
  location: SegmentLocation;
}

function flaggedSlots(song: Song): FlaggedSlot[] {
  const keys = reviewKeys(song);
  return song.sections.flatMap((section) =>
    section.lines.flatMap((line) =>
      line.segments
        .filter((segment): segment is FlaggedSlot["segment"] =>
          Boolean(segment.chordPosition) && reviewSegmentChord(segment, keys) !== null
        )
        .map((segment) => ({ segment, location: { sectionId: section.id, lineId: line.id, segmentId: segment.id } }))
    )
  );
}

/** Everything the reader needs for the chords currently flagged for review. */
export function buildRereadItems(song: Song): { items: RereadItem[]; printedKeyName: string | null } {
  const atPrintedKey = printedKeysMatch(song);
  const items = flaggedSlots(song).map(({ segment }) => ({
    id: segment.id,
    bbox: segment.chordPosition,
    // A garbled token is never transposed (see transposeSong), so it's
    // still exactly what OCR read. A valid-looking chord was transposed
    // along with the song, so it only matches the image at the printed key.
    ocrText: atPrintedKey || !isChordToken(segment.chord ?? "") ? segment.chord : null,
  }));
  const printed = printedKey(song);
  return { items, printedKeyName: printed ? formatKey(printed) : null };
}

/**
 * Turns raw reader output into suggestions, dropping anything that can't be
 * trusted: ids we didn't ask about, "unsure" answers, and chords that don't
 * pass the chord grammar. The reader reads the printed page, so its chords
 * are moved from the printed key into the song's current key.
 */
export function toSuggestions(song: Song, items: RereadItem[], results: RereadResult[]): Map<string, ChordSuggestion> {
  const asked = new Set(items.map((item) => item.id));
  const from = printedKey(song);
  const to = currentKey(song);
  const suggestions = new Map<string, ChordSuggestion>();

  for (const result of results) {
    if (!asked.has(result.id) || suggestions.has(result.id) || result.kind === "unsure") continue;
    if (result.kind === "not_chord") {
      suggestions.set(result.id, { kind: "remove", confident: result.confident });
      continue;
    }
    const chords = result.chords.map((c) => c.trim()).filter(Boolean);
    if (chords.length === 0 || !chords.every(isChordToken)) continue;
    const moved = from && to && !keysEqual(from, to) ? chords.map((c) => transposeChordText(c, from, to)) : chords;
    suggestions.set(result.id, { kind: "replace", chords: moved, confident: result.confident });
  }
  return suggestions;
}

/**
 * Writes one accepted suggestion into the song. Several chords in one slot
 * (OCR glued neighbors together) split the slot's box evenly, left to right.
 * Accepted chords carry no confidence, so they count as user-confirmed.
 */
export function applySuggestion(song: Song, segmentId: string, suggestion: ChordSuggestion): Song {
  const slot = findSlot(song, segmentId);
  if (!slot) return song;
  if (suggestion.kind === "remove") return updateSegment(song, slot.location, { chord: null });

  const [first, ...rest] = suggestion.chords;
  let next = updateSegment(song, slot.location, { chord: first });
  if (rest.length === 0) return next;

  const box = slot.segment.chordPosition;
  const width = box.width / suggestion.chords.length;
  next = moveChord(next, slot.location, { ...box, width });
  rest.forEach((chord, i) => {
    next = addChord(next, { ...box, x: box.x + width * (i + 1), width }, chord);
  });
  return next;
}

function findSlot(song: Song, segmentId: string): FlaggedSlot | null {
  for (const section of song.sections) {
    for (const line of section.lines) {
      const segment = line.segments.find((s) => s.id === segmentId);
      if (segment?.chordPosition) {
        return {
          segment: segment as FlaggedSlot["segment"],
          location: { sectionId: section.id, lineId: line.id, segmentId },
        };
      }
    }
  }
  return null;
}

function printedKeysMatch(song: Song): boolean {
  const from = printedKey(song);
  const to = currentKey(song);
  return !from || !to || keysEqual(from, to);
}
