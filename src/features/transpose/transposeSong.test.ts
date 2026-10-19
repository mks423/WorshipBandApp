import { formatKey, parseKey } from "../../domain/music-theory";
import { createEmptySong, createLine, createSection, createSegment, type Song } from "../../types/song";
import { currentKey, keyChoicesForSong, transposeSong, transposeSongToKey } from "./transposeSong";

function songWithChords(chords: string[], originalKey: string | null): Song {
  const song = createEmptySong("Test");
  song.originalKey = originalKey;
  song.sections.push(createSection("Verse 1", [createLine(chords.map((chord) => createSegment({ chord, lyric: "x " })))]));
  return song;
}

function chordsOf(song: Song): (string | null)[] {
  return song.sections.flatMap((s) => s.lines.flatMap((l) => l.segments.map((seg) => seg.chord)));
}

function keyName(song: Song): string | null {
  const key = currentKey(song);
  return key ? formatKey(key) : null;
}

describe("transposeSong", () => {
  it("spells chords for the new key when stepping down from G to F", () => {
    const song = transposeSong(songWithChords(["G", "C", "D/F#", "Em"], "G"), -2);
    expect(chordsOf(song)).toEqual(["F", "Bb", "C/E", "Dm"]);
    expect(keyName(song)).toBe("F");
    expect(song.transposeSteps).toBe(-2);
  });

  it("lands on Ab (not G#) one semitone above G", () => {
    const song = transposeSong(songWithChords(["G", "C", "D", "Em"], "G"), 1);
    expect(chordsOf(song)).toEqual(["Ab", "Db", "Eb", "Fm"]);
    expect(keyName(song)).toBe("Ab");
  });

  it("stays correctly spelled through repeated semitone steps and back", () => {
    let song = songWithChords(["G", "C", "D", "Em", "Bm"], "G");
    for (let i = 0; i < 12; i++) song = transposeSong(song, 1);
    expect(chordsOf(song)).toEqual(["G", "C", "D", "Em", "Bm"]);
    expect(keyName(song)).toBe("G");
  });

  it("keeps a flat-side original on the flat side at the six-accidental tie", () => {
    const song = transposeSong(songWithChords(["F", "Bb", "C"], "F"), 1);
    expect(keyName(song)).toBe("Gb");
    expect(chordsOf(song)).toEqual(["Gb", "Cb", "Db"]);
  });

  it("returns to the original key's exact spelling at offset 0", () => {
    let song = songWithChords(["Gb", "Cb", "Db"], "Gb");
    song = transposeSong(transposeSong(song, 2), -2);
    expect(keyName(song)).toBe("Gb");
    expect(chordsOf(song)).toEqual(["Gb", "Cb", "Db"]);
  });

  it("handles minor-key songs", () => {
    const song = transposeSong(songWithChords(["Em", "C", "G", "D"], "Em"), -2);
    expect(chordsOf(song)).toEqual(["Dm", "Bb", "F", "C"]);
    expect(keyName(song)).toBe("Dm");
  });

  it("infers the key from the chords when originalKey is unknown", () => {
    const song = transposeSong(songWithChords(["G", "C", "D"], null), -2);
    expect(chordsOf(song)).toEqual(["F", "Bb", "C"]);
  });

  it("leaves non-chord text and chordless segments alone", () => {
    const song = transposeSong(songWithChords(["G", "N.C.", "C"], "G"), 2);
    expect(chordsOf(song)).toEqual(["A", "N.C.", "D"]);
  });

  it("does not mutate the input song", () => {
    const original = songWithChords(["G", "C"], "G");
    transposeSong(original, 3);
    expect(chordsOf(original)).toEqual(["G", "C"]);
    expect(original.transposeSteps).toBe(0);
  });
});

describe("transposeSongToKey", () => {
  it("jumps to the chosen key and keeps the offset within [-6, 5]", () => {
    const song = transposeSongToKey(songWithChords(["G", "C", "D"], "G"), parseKey("F")!);
    expect(chordsOf(song)).toEqual(["F", "Bb", "C"]);
    expect(song.transposeSteps).toBe(-2);

    const up = transposeSongToKey(song, parseKey("B")!);
    expect(chordsOf(up)).toEqual(["B", "E", "F#"]);
    expect(up.transposeSteps).toBe(4);
  });
});

describe("keyChoicesForSong", () => {
  it("offers conventionally spelled keys in the song's mode", () => {
    expect(keyChoicesForSong(songWithChords(["G"], "G")).map(formatKey)).toEqual(
      ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    );
    expect(keyChoicesForSong(songWithChords(["Em"], "Em")).map(formatKey)).toEqual(
      ["Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"]
    );
  });

  it("shows the original key in its own spelling", () => {
    expect(keyChoicesForSong(songWithChords(["Gb"], "Gb")).map(formatKey)).toContain("Gb");
  });
});
