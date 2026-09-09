import { classifyLines } from "./classifyLines";
import { groupTokensIntoLines } from "./groupIntoLines";
import { mergeAdjacentTokens } from "./mergeAdjacentTokens";
import { splitGluedTokensOnLine } from "./splitGluedTokens";
import type { ClassifiedLine, OcrToken } from "./types";
import {
  createEmptySong,
  createLine,
  createSection,
  createSegment,
  type Line,
  type Segment,
  type Song,
} from "../../types/song";

const DEFAULT_SECTION_NAME = "Verse 1";

/**
 * Turns raw OCR tokens from a scanned chart into a draft Song: groups tokens
 * into lines, classifies each line, pairs chord lines with the lyric line
 * beneath them into chord+lyric segments, and starts a new section whenever
 * a section-label line (e.g. "Chorus") is found.
 *
 * The result is a *draft* meant for the user to review and correct in the
 * editor: OCR misreads a character, a chord line can be misdetected as
 * lyrics (and vice versa), and chord-to-word alignment is a nearest-neighbor
 * heuristic, not a guarantee. Segment.confidence reflects that draft-ness
 * inline so a review UI can surface it.
 */
export function buildSongFromOcr(
  tokens: OcrToken[],
  title: string,
  sourceImage?: { uri: string; width: number; height: number }
): Song {
  const song = createEmptySong(title);
  if (sourceImage) song.sourceImage = sourceImage;
  const classified = classifyLines(
    groupTokensIntoLines(tokens).map(mergeAdjacentTokens).map(splitGluedTokensOnLine)
  ).filter((line) => !isNoiseLine(line));

  let currentSection = createSection(DEFAULT_SECTION_NAME);
  song.sections.push(currentSection);

  for (let i = 0; i < classified.length; i++) {
    const line = classified[i];

    if (line.type === "blank") continue;

    if (line.type === "section") {
      const name = line.tokens.map((t) => t.text).join(" ").replace(/[:.]$/, "").trim();
      currentSection = createSection(name);
      song.sections.push(currentSection);
      continue;
    }

    if (line.type === "lyric") {
      // A lyric line not preceded by a chord line we already consumed: plain lyric, no chords.
      currentSection.lines.push(createLine([createSegment({ chord: null, lyric: joinTokens(line) })]));
      continue;
    }

    // line.type === "chord": look ahead for an immediately following lyric line to pair with.
    const next = classified[i + 1];
    if (next && next.type === "lyric") {
      currentSection.lines.push(createLine(mergeChordAndLyricLine(line, next)));
      i += 1; // consume the paired lyric line
    } else {
      // No lyric beneath (e.g. an instrumental line): keep the chords with empty lyrics.
      currentSection.lines.push(
        createLine(
          line.tokens.map((token, idx) =>
            createSegment({
              chord: token.text,
              lyric: idx === line.tokens.length - 1 ? "" : " ",
              confidence: line.chordTokenRatio,
              chordPosition: tokenPosition(token),
            })
          )
        )
      );
    }
  }

  // Drop the leading default section if the chart opened with an explicit
  // section label and it ended up empty; keep it otherwise (untitled charts
  // still need somewhere for their first lines to live).
  const nonEmptySections = song.sections.filter((section) => section.lines.length > 0);
  song.sections = nonEmptySections.length > 0 ? nonEmptySections : song.sections;

  return song;
}

/**
 * Builds one independent Song per page of OCR tokens (e.g. one per picked
 * photo, or one per page of a scanned PDF) — each page of sheet music is its
 * own song to review and edit separately, not merged into one. Pages with no
 * recognized text are skipped (e.g. a blank PDF page).
 */
export function buildSongsFromPages(
  pages: Array<{
    tokens: OcrToken[];
    title: string;
    sourceImage?: { uri: string; width: number; height: number };
  }>
): Song[] {
  return pages
    .filter((page) => page.tokens.length > 0)
    .map((page) => buildSongFromOcr(page.tokens, page.title, page.sourceImage));
}

function joinTokens(line: ClassifiedLine): string {
  return line.tokens.map((t) => t.text).join(" ");
}

function tokenPosition(token: OcrToken): { x: number; y: number; width: number; height: number } {
  return { x: token.x, y: token.y, width: token.width, height: token.height };
}

/**
 * Measure numbers and time signatures printed above the staff (e.g. a lone
 * "5" at the start of a system, or "4/4") get picked up as OCR text even
 * though they're not chart content. Left alone, a short digits-only line
 * lands between the chord line and the real lyric line and steals the
 * "next lyric line" pairing. A real lyric line — in any language — is never
 * pure digits, so it's safe to drop these before pairing.
 */
function isNoiseLine(line: ClassifiedLine): boolean {
  return (
    line.tokens.length > 0 &&
    line.tokens.length <= 3 &&
    line.tokens.every((t) => /^\d+(\/\d+)?$/.test(t.text.trim()))
  );
}

/**
 * Aligns each chord token to the nearest lyric word by x-position (the chord
 * is printed directly above the word it applies to) and slices the lyric
 * line into segments at those anchor points.
 */
function mergeChordAndLyricLine(chordLine: ClassifiedLine, lyricLine: ClassifiedLine): Segment[] {
  const chordTokens = chordLine.tokens;
  const lyricTokens = lyricLine.tokens;

  if (lyricTokens.length === 0) {
    return chordTokens.map((token) =>
      createSegment({
        chord: token.text,
        lyric: "",
        confidence: chordLine.chordTokenRatio,
        chordPosition: tokenPosition(token),
      })
    );
  }

  // For each chord, find the closest lyric word at or after the previous chord's anchor,
  // keeping anchors non-decreasing so segments come out in reading order.
  const anchors: number[] = [];
  let searchStart = 0;
  for (const chord of chordTokens) {
    let bestIndex = searchStart;
    let bestDistance = Math.abs(lyricTokens[searchStart].x - chord.x);
    for (let i = searchStart + 1; i < lyricTokens.length; i++) {
      const distance = Math.abs(lyricTokens[i].x - chord.x);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      } else if (lyricTokens[i].x > chord.x) {
        break; // lyric x is sorted ascending; once we've passed the chord and stopped improving, stop searching
      }
    }
    anchors.push(bestIndex);
    searchStart = bestIndex;
  }

  const segments: Segment[] = [];
  const confidence = Math.min(chordLine.chordTokenRatio, 1);

  if (anchors[0] > 0) {
    const leadingWords = lyricTokens.slice(0, anchors[0]).map((t) => t.text).join(" ");
    segments.push(createSegment({ chord: null, lyric: `${leadingWords} ` }));
  }

  // A running cursor (not just `anchors[c]`) tracks which lyric words are
  // already claimed, since multiple chords can anchor to the same nearest
  // word when there are far fewer lyric tokens than chords (e.g. a chord
  // line paired with a short or noisy lyric line) — without it, later
  // segments would re-slice and repeat words an earlier segment already used.
  let cursor = anchors[0] ?? 0;
  for (let c = 0; c < chordTokens.length; c++) {
    const start = Math.max(anchors[c], cursor);
    const end = c + 1 < anchors.length ? Math.max(anchors[c + 1], start + 1) : lyricTokens.length;
    const words = lyricTokens.slice(start, end).map((t) => t.text);
    const isLast = end >= lyricTokens.length;
    segments.push(
      createSegment({
        chord: chordTokens[c].text,
        lyric: words.join(" ") + (isLast ? "" : " "),
        confidence,
        chordPosition: tokenPosition(chordTokens[c]),
      })
    );
    cursor = end;
  }

  return segments;
}
