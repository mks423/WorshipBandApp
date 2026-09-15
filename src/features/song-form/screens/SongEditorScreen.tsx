import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { transposeChord } from "../../transpose";
import type { Song } from "../../../types/song";
import { getSectionLabelColor } from "../sectionLabelColors";
import { SongFormModal } from "./SongFormModal";
import { SongInfoModal } from "./SongInfoModal";
import { SourceOverlayScreen } from "./SourceOverlayScreen";

interface SongEditorScreenProps {
  song: Song;
  onSongChange: (song: Song) => void;
  onDone: () => void;
  /** This song's position within a multi-page scan batch (0-based), for the page-flip row. Omit for a single scanned song. */
  pageIndex?: number;
  /** Total pages in the current batch. The page-flip row only shows when this is greater than 1. */
  pageCount?: number;
  /** Moves to the previous (-1) or next (+1) page within the batch, clamped at the ends. */
  onNavigatePage?: (delta: number) => void;
}

export function SongEditorScreen({
  song,
  onSongChange,
  onDone,
  pageIndex,
  pageCount,
  onNavigatePage,
}: SongEditorScreenProps) {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [songFormModalVisible, setSongFormModalVisible] = useState(false);
  const overlayRef = useRef<View>(null);
  const showPageNav = pageCount !== undefined && pageCount > 1 && pageIndex !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          value={song.title}
          onChangeText={(title) => onSongChange({ ...song, title })}
          placeholder="곡 제목"
        />
        <View style={styles.keyInfoRow}>
          <Text style={styles.keyInfoText}>인식된 키: {song.originalKey ?? "알 수 없음"}</Text>
          {song.originalKey && (
            <Text style={styles.keyInfoText}>
              현재 키: {transposeChord(song.originalKey, song.transposeSteps)}
            </Text>
          )}
          <View style={styles.bpmRow}>
            <Text style={styles.keyInfoText}>BPM</Text>
            <TextInput
              style={styles.bpmInput}
              value={song.bpm !== null ? String(song.bpm) : ""}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, "");
                onSongChange({ ...song, bpm: digits.length > 0 ? Number(digits) : null });
              }}
              placeholder="-"
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerActionButton} onPress={() => setInfoModalVisible(true)}>
              <Text style={styles.headerActionButtonText}>편집</Text>
            </Pressable>
            <Pressable style={styles.headerActionButton} onPress={onDone}>
              <Text style={styles.headerActionButtonText}>목록</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.songFormRow}>
        {song.sectionMarkers.length === 0 ? (
          <Pressable style={styles.songFormButton} onPress={() => setSongFormModalVisible(true)}>
            <Text style={styles.songFormButtonText}>+ 송폼 추가</Text>
          </Pressable>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.songFormBadgeScroll}
              contentContainerStyle={styles.songFormBadgeRow}
            >
              {song.sectionMarkers.map((marker, i) => (
                <View key={marker.id} style={styles.songFormBadgeGroup}>
                  {i > 0 && <Text style={styles.songFormArrow}>→</Text>}
                  <View style={[styles.songFormBadge, { backgroundColor: getSectionLabelColor(marker.label) }]}>
                    <Text style={styles.songFormBadgeText}>{marker.label}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.songFormButton} onPress={() => setSongFormModalVisible(true)}>
              <Text style={styles.songFormButtonText}>편집</Text>
            </Pressable>
          </>
        )}
      </View>

      <SourceOverlayScreen song={song} onSongChange={onSongChange} viewShotRef={overlayRef} />

      {showPageNav && (
        <View style={styles.pageNavRow}>
          <Pressable
            style={[styles.pageNavButton, pageIndex === 0 && styles.pageNavButtonDisabled]}
            disabled={pageIndex === 0}
            onPress={() => onNavigatePage?.(-1)}
          >
            <Text style={styles.pageNavButtonText}>◀ 이전 페이지</Text>
          </Pressable>
          <Text style={styles.pageIndicator}>
            {pageIndex! + 1} / {pageCount}
          </Text>
          <Pressable
            style={[styles.pageNavButton, pageIndex === pageCount! - 1 && styles.pageNavButtonDisabled]}
            disabled={pageIndex === pageCount! - 1}
            onPress={() => onNavigatePage?.(1)}
          >
            <Text style={styles.pageNavButtonText}>다음 페이지 ▶</Text>
          </Pressable>
        </View>
      )}

      <SongInfoModal
        visible={infoModalVisible}
        song={song}
        onSongChange={onSongChange}
        onClose={() => setInfoModalVisible(false)}
      />

      <SongFormModal
        visible={songFormModalVisible}
        song={song}
        onSongChange={onSongChange}
        onClose={() => setSongFormModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  keyInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  keyInfoText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "600",
  },
  bpmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bpmInput: {
    minWidth: 36,
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
  },
  headerActionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  songFormRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  songFormButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  songFormButtonText: {
    fontWeight: "700",
    fontSize: 13,
    color: "#333",
  },
  songFormBadgeScroll: {
    flex: 1,
  },
  songFormBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  songFormBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  songFormArrow: {
    color: "#aaa",
    fontWeight: "700",
  },
  songFormBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  songFormBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  pageNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fafafa",
  },
  pageNavButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
  },
  pageNavButtonDisabled: {
    backgroundColor: "#ccc",
  },
  pageNavButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  pageIndicator: {
    fontWeight: "700",
    color: "#333",
  },
});
