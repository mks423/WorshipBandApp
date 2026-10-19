import { createEmptySong, createLine, createSection, createSegment, type Song } from "../../types/song";
import { transposeSong } from "../transpose";
import { applySuggestion, buildRereadItems, toSuggestions } from "./aiSuggestions";

const box = (x: number) => ({ x, y: 10, width: 30, height: 12 });

function chart(): Song {
  const song = createEmptySong("Psalm 139");
  song.originalKey = "A";
  song.sections.push(
    createSection("V1", [
      createLine([
        createSegment({ chord: "A", lyric: "x", confidence: 0.9, chordPosition: box(0) }),
        createSegment({ chord: "Acad", lyric: "x", confidence: 0.9, chordPosition: box(40) }),
        createSegment({ chord: "A/C", lyric: "x", confidence: 0.9, chordPosition: box(80) }),
        createSegment({ chord: "11-Bb", lyric: "x", confidence: 0.9, chordPosition: box(120) }),
      ]),
    ])
  );
  return song;
}

const chordsOf = (song: Song) => song.sections.flatMap((s) => s.lines.flatMap((l) => l.segments.map((g) => g.chord)));
const idOf = (song: Song, chord: string) =>
  song.sections.flatMap((s) => s.lines.flatMap((l) => l.segments)).find((g) => g.chord === chord)!.id;

describe("buildRereadItems", () => {
  it("asks only about flagged chords, with OCR text and the printed key", () => {
    const song = chart();
    const { items, printedKeyName } = buildRereadItems(song);
    expect(items.map((i) => i.ocrText)).toEqual(["Acad", "A/C", "11-Bb"]);
    expect(printedKeyName).toBe("A");
  });

  it("withholds transposed chord text (it no longer matches the image) but keeps untouched misreads", () => {
    const song = transposeSong(chart(), 3);
    const { items, printedKeyName } = buildRereadItems(song);
    expect(items.map((i) => i.ocrText)).toEqual(["Acad", null, "11-Bb"]);
    expect(printedKeyName).toBe("A");
  });
});

describe("toSuggestions", () => {
  it("keeps valid answers, drops unsure / invalid / unasked ones", () => {
    const song = chart();
    const { items } = buildRereadItems(song);
    const [acad, ac, volta] = items.map((i) => i.id);
    const suggestions = toSuggestions(song, items, [
      { id: acad, kind: "chords", chords: ["A(add2)"], confident: true },
      { id: ac, kind: "unsure" },
      { id: volta, kind: "chords", chords: ["Bb", "not a chord"], confident: true },
      { id: "made-up", kind: "chords", chords: ["G"], confident: true },
    ]);
    expect([...suggestions.keys()]).toEqual([acad]);
    expect(suggestions.get(acad)).toEqual({ kind: "replace", chords: ["A(add2)"], confident: true });
  });

  it("moves chords read from the printed page into the song's current key", () => {
    const song = transposeSong(chart(), 3); // A → C
    const { items } = buildRereadItems(song);
    const suggestions = toSuggestions(song, items, [{ id: items[1].id, kind: "chords", chords: ["A/C#"], confident: true }]);
    expect(suggestions.get(items[1].id)).toEqual({ kind: "replace", chords: ["C/E"], confident: true });
  });

  it("turns not_chord into a removal", () => {
    const song = chart();
    const { items } = buildRereadItems(song);
    const suggestions = toSuggestions(song, items, [{ id: items[2].id, kind: "not_chord", confident: false }]);
    expect(suggestions.get(items[2].id)).toEqual({ kind: "remove", confident: false });
  });
});

describe("applySuggestion", () => {
  it("replaces the chord and marks it confirmed", () => {
    const song = chart();
    const next = applySuggestion(song, idOf(song, "Acad"), { kind: "replace", chords: ["A(add2)"], confident: true });
    expect(chordsOf(next)).toEqual(["A", "A(add2)", "A/C", "11-Bb"]);
    const seg = next.sections[0].lines[0].segments[1];
    expect(seg.confidence).toBeUndefined();
  });

  it("splits a glued slot into evenly spaced chords", () => {
    const song = chart();
    const next = applySuggestion(song, idOf(song, "11-Bb"), { kind: "replace", chords: ["F/C", "A", "Bb"], confident: true });
    const all = next.sections.flatMap((s) => s.lines.flatMap((l) => l.segments)).filter((g) => g.chord);
    const added = all.filter((g) => ["F/C", "A", "Bb"].includes(g.chord!) && g.chordPosition!.x >= 120);
    expect(added.map((g) => [g.chord, g.chordPosition!.x, g.chordPosition!.width])).toEqual([
      ["F/C", 120, 10],
      ["A", 130, 10],
      ["Bb", 140, 10],
    ]);
  });

  it("removes the chord for a not_chord suggestion", () => {
    const song = chart();
    const next = applySuggestion(song, idOf(song, "11-Bb"), { kind: "remove", confident: true });
    expect(chordsOf(next)).toEqual(["A", "Acad", "A/C", null]);
  });
});
