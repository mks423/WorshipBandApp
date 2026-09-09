import { createEmptySong, createLine, createSection, createSegment } from "../../types/song";
import { addChord, moveChord, updateSegment } from "./editSong";

function makeSong() {
  const segment1 = createSegment({ chord: "G", lyric: "Amazing ", chordPosition: { x: 10, y: 20, width: 15, height: 12 } });
  const segment2 = createSegment({ chord: "C", lyric: "grace" });
  const line = createLine([segment1, segment2]);
  const section = createSection("Verse 1", [line]);
  const song = createEmptySong("Amazing Grace");
  song.sections.push(section);
  return { song, section, line, segment1, segment2 };
}

describe("updateSegment", () => {
  it("edits a segment's lyric and chord without touching others", () => {
    const { song, section, line, segment1 } = makeSong();

    const updated = updateSegment(
      song,
      { sectionId: section.id, lineId: line.id, segmentId: segment1.id },
      { chord: "G7", lyric: "A-maz-ing " }
    );

    const [s1, s2] = updated.sections[0].lines[0].segments;
    expect(s1.chord).toBe("G7");
    expect(s1.lyric).toBe("A-maz-ing ");
    expect(s2.lyric).toBe("grace");
  });

  it("does not mutate the original song", () => {
    const { song, section, line, segment1 } = makeSong();
    updateSegment(song, { sectionId: section.id, lineId: line.id, segmentId: segment1.id }, { lyric: "changed" });
    expect(song.sections[0].lines[0].segments[0].lyric).toBe("Amazing ");
  });
});

describe("moveChord", () => {
  it("updates just the chord's position, leaving chord/lyric untouched", () => {
    const { song, section, line, segment1 } = makeSong();

    const updated = moveChord(
      song,
      { sectionId: section.id, lineId: line.id, segmentId: segment1.id },
      { x: 99, y: 55, width: 15, height: 12 }
    );

    const moved = updated.sections[0].lines[0].segments[0];
    expect(moved.chordPosition).toEqual({ x: 99, y: 55, width: 15, height: 12 });
    expect(moved.chord).toBe("G");
    expect(moved.lyric).toBe("Amazing ");
  });

  it("does not mutate the original song", () => {
    const { song, section, line, segment1 } = makeSong();
    moveChord(song, { sectionId: section.id, lineId: line.id, segmentId: segment1.id }, { x: 0, y: 0, width: 1, height: 1 });
    expect(song.sections[0].lines[0].segments[0].chordPosition).toEqual({ x: 10, y: 20, width: 15, height: 12 });
  });
});

describe("addChord", () => {
  it("appends a new chord-only line to the last section, positioned where given", () => {
    const { song } = makeSong();

    const updated = addChord(song, { x: 120, y: 340, width: 30, height: 20 }, "D");

    const lastSection = updated.sections[updated.sections.length - 1];
    const newLine = lastSection.lines[lastSection.lines.length - 1];
    expect(newLine.segments).toHaveLength(1);
    expect(newLine.segments[0]).toMatchObject({ chord: "D", lyric: "", chordPosition: { x: 120, y: 340, width: 30, height: 20 } });
  });

  it("does not mutate the original song", () => {
    const { song } = makeSong();
    addChord(song, { x: 0, y: 0, width: 10, height: 10 }, "D");
    expect(song.sections[0].lines).toHaveLength(1);
  });

  it("creates a first section when the song has none yet", () => {
    const song = createEmptySong("Blank");

    const updated = addChord(song, { x: 0, y: 0, width: 10, height: 10 }, "A");

    expect(updated.sections).toHaveLength(1);
    expect(updated.sections[0].lines[0].segments[0].chord).toBe("A");
  });
});
