import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  addLine,
  addSection,
  mergeSegmentWithNext,
  removeLine,
  removeSection,
  removeSegment,
  renameSection,
  splitSegment,
  updateSegment,
  type SegmentLocation,
} from "../editSong";
import { transposeSong } from "../../transpose";
import type { Line, Section, Segment, Song } from "../../../types/song";
import { SourceOverlayScreen } from "./SourceOverlayScreen";

interface SongEditorScreenProps {
  song: Song;
  onSongChange: (song: Song) => void;
  onDone: () => void;
}

export function SongEditorScreen({ song, onSongChange, onDone }: SongEditorScreenProps) {
  const [viewMode, setViewMode] = useState<"edit" | "original">("edit");

  return (
    <View style={styles.container}>
      {viewMode === "edit" ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            style={styles.titleInput}
            value={song.title}
            onChangeText={(title) => onSongChange({ ...song, title })}
            placeholder="곡 제목"
          />

          <View style={styles.transposeRow}>
            <Pressable style={styles.transposeButton} onPress={() => onSongChange(transposeSong(song, -1))}>
              <Text style={styles.transposeButtonText}>- 반음</Text>
            </Pressable>
            <Text style={styles.transposeLabel}>
              원key 대비 {song.transposeSteps >= 0 ? "+" : ""}
              {song.transposeSteps}
            </Text>
            <Pressable style={styles.transposeButton} onPress={() => onSongChange(transposeSong(song, 1))}>
              <Text style={styles.transposeButtonText}>+ 반음</Text>
            </Pressable>
          </View>

          {song.sections.map((section) => (
            <SectionEditor
              key={section.id}
              song={song}
              section={section}
              onSongChange={onSongChange}
            />
          ))}

          <Pressable
            style={styles.addSectionButton}
            onPress={() => onSongChange(addSection(song, "새 섹션"))}
          >
            <Text style={styles.addSectionButtonText}>+ 섹션 추가</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <SourceOverlayScreen song={song} />
      )}

      <View style={styles.bottomBar}>
        {song.sourceImage && (
          <Pressable
            style={styles.bottomButton}
            onPress={() => setViewMode(viewMode === "edit" ? "original" : "edit")}
          >
            <Text style={styles.bottomButtonText}>{viewMode === "edit" ? "원본 보기" : "편집 화면"}</Text>
          </Pressable>
        )}
        <Pressable style={styles.bottomButton} onPress={onDone}>
          <Text style={styles.bottomButtonText}>다시 스캔하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionEditor({
  song,
  section,
  onSongChange,
}: {
  song: Song;
  section: Section;
  onSongChange: (song: Song) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TextInput
          style={styles.sectionNameInput}
          value={section.name}
          onChangeText={(name) => onSongChange(renameSection(song, section.id, name))}
        />
        <Pressable onPress={() => onSongChange(removeSection(song, section.id))}>
          <Text style={styles.removeText}>섹션 삭제</Text>
        </Pressable>
      </View>

      {section.lines.map((line) => (
        <LineEditor key={line.id} song={song} sectionId={section.id} line={line} onSongChange={onSongChange} />
      ))}

      <Pressable style={styles.addLineButton} onPress={() => onSongChange(addLine(song, section.id))}>
        <Text style={styles.addLineButtonText}>+ 줄 추가</Text>
      </Pressable>
    </View>
  );
}

function LineEditor({
  song,
  sectionId,
  line,
  onSongChange,
}: {
  song: Song;
  sectionId: string;
  line: Line;
  onSongChange: (song: Song) => void;
}) {
  return (
    <View style={styles.line}>
      <View style={styles.segmentRow}>
        {line.segments.map((segment) => (
          <SegmentEditor
            key={segment.id}
            song={song}
            location={{ sectionId, lineId: line.id, segmentId: segment.id }}
            segment={segment}
            canMerge={line.segments.indexOf(segment) < line.segments.length - 1}
            onSongChange={onSongChange}
          />
        ))}
      </View>
      <Pressable onPress={() => onSongChange(removeLine(song, sectionId, line.id))}>
        <Text style={styles.removeText}>줄 삭제</Text>
      </Pressable>
    </View>
  );
}

function SegmentEditor({
  song,
  location,
  segment,
  canMerge,
  onSongChange,
}: {
  song: Song;
  location: SegmentLocation;
  segment: Segment;
  canMerge: boolean;
  onSongChange: (song: Song) => void;
}) {
  const lowConfidence = segment.confidence !== undefined && segment.confidence < 0.8;

  return (
    <View style={[styles.segment, lowConfidence && styles.segmentLowConfidence]}>
      <TextInput
        style={styles.chordInput}
        value={segment.chord ?? ""}
        placeholder="코드"
        onChangeText={(text) => onSongChange(updateSegment(song, location, { chord: text.length > 0 ? text : null }))}
      />
      <TextInput
        style={styles.lyricInput}
        value={segment.lyric}
        placeholder="가사"
        onChangeText={(lyric) => onSongChange(updateSegment(song, location, { lyric }))}
      />
      <View style={styles.segmentActions}>
        <Pressable onPress={() => onSongChange(splitSegment(song, location, Math.ceil(segment.lyric.length / 2)))}>
          <Text style={styles.segmentActionText}>나누기</Text>
        </Pressable>
        {canMerge && (
          <Pressable onPress={() => onSongChange(mergeSegmentWithNext(song, location))}>
            <Text style={styles.segmentActionText}>합치기</Text>
          </Pressable>
        )}
        <Pressable onPress={() => onSongChange(removeSegment(song, location))}>
          <Text style={styles.segmentActionText}>삭제</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  transposeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
  },
  transposeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#2f6feb",
    borderRadius: 8,
  },
  transposeButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  transposeLabel: {
    fontWeight: "600",
  },
  section: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionNameInput: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  line: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    minWidth: 90,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 6,
    gap: 4,
  },
  segmentLowConfidence: {
    borderColor: "#e0a800",
    backgroundColor: "#fff9e6",
  },
  chordInput: {
    fontWeight: "700",
    color: "#2f6feb",
    minWidth: 50,
  },
  lyricInput: {
    minWidth: 70,
  },
  segmentActions: {
    flexDirection: "row",
    gap: 8,
  },
  segmentActionText: {
    fontSize: 11,
    color: "#888",
  },
  removeText: {
    fontSize: 12,
    color: "#c0392b",
  },
  addLineButton: {
    alignSelf: "flex-start",
  },
  addLineButtonText: {
    color: "#2f6feb",
    fontWeight: "600",
  },
  addSectionButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2f6feb",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  addSectionButtonText: {
    color: "#2f6feb",
    fontWeight: "700",
  },
  bottomBar: {
    flexDirection: "row",
  },
  bottomButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#eee",
  },
  bottomButtonText: {
    fontWeight: "700",
  },
});
