import { classifyLines } from "./classifyLines";
import { groupTokensIntoLines } from "./groupIntoLines";
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
export function buildSongFromOcr(tokens: OcrToken[], title: string): Song {
  const song = createEmptySong(title);
  const classified = classifyLines(groupTokensIntoLines(tokens));

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

function joinTokens(line: ClassifiedLine): string {
  return line.tokens.map((t) => t.text).join(" ");
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
    return chordTokens.map((token) => createSegment({ chord: token.text, lyric: "", confidence: chordLine.chordTokenRatio }));
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

  for (let c = 0; c < chordTokens.length; c++) {
    const start = anchors[c];
    const end = c + 1 < anchors.length ? Math.max(anchors[c + 1], start + 1) : lyricTokens.length;
    const words = lyricTokens.slice(start, end).map((t) => t.text);
    const isLast = end >= lyricTokens.length;
    segments.push(
      createSegment({
        chord: chordTokens[c].text,
        lyric: words.join(" ") + (isLast ? "" : " "),
        confidence,
      })
    );
  }

  return segments;
}
