import { createEmptySong, createLine, createSection, createSegment } from "../../types/song";
import { mergeSegmentWithNext, removeSegment, splitSegment, updateSegment } from "./editSong";

function makeSong() {
  const segment1 = createSegment({ chord: "G", lyric: "Amazing " });
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

describe("splitSegment", () => {
  it("splits a segment's lyric at the given offset, keeping the chord on the first half", () => {
    const { song, section, line, segment1 } = makeSong();

    const updated = splitSegment(song, { sectionId: section.id, lineId: line.id, segmentId: segment1.id }, 2);

    const segments = updated.sections[0].lines[0].segments;
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ chord: "G", lyric: "Am" });
    expect(segments[1]).toMatchObject({ chord: null, lyric: "azing " });
    expect(segments[2]).toMatchObject({ chord: "C", lyric: "grace" });
  });
});

describe("mergeSegmentWithNext", () => {
  it("combines two segments' lyrics and drops the second chord", () => {
    const { song, section, line, segment1 } = makeSong();

    const updated = mergeSegmentWithNext(song, { sectionId: section.id, lineId: line.id, segmentId: segment1.id });

    const segments = updated.sections[0].lines[0].segments;
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ chord: "G", lyric: "Amazing grace" });
  });

  it("is a no-op on the last segment of a line", () => {
    const { song, section, line, segment2 } = makeSong();

    const updated = mergeSegmentWithNext(song, { sectionId: section.id, lineId: line.id, segmentId: segment2.id });

    expect(updated.sections[0].lines[0].segments).toHaveLength(2);
  });
});

describe("removeSegment", () => {
  it("removes just the targeted segment", () => {
    const { song, section, line, segment2 } = makeSong();

    const updated = removeSegment(song, { sectionId: section.id, lineId: line.id, segmentId: segment2.id });

    const segments = updated.sections[0].lines[0].segments;
    expect(segments).toHaveLength(1);
    expect(segments[0].chord).toBe("G");
  });
});
