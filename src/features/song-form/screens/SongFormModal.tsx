import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { removeSectionMarker, updateSectionMarker } from "../editSong";
import type { Song } from "../../../types/song";

interface SongFormModalProps {
  visible: boolean;
  song: Song;
  onSongChange: (song: Song) => void;
  onClose: () => void;
}

/**
 * Manages a song's structure — its Verse/Chorus/Bridge-style section
 * markers — separately from SongInfoModal (title/BPM/key), since "송폼"
 * (song form/structure) here means the song's section layout, not the
 * unrelated "송폼" (setlist) feature elsewhere in this app.
 *
 * Only renames/removes *existing* markers. Placing a brand-new one still
 * happens by tapping the chart directly (via "+ 섹션 라벨" in the overlay
 * toolbar), since that needs a screen position this modal has no way to
 * capture.
 *
 * Same draft-then-commit pattern as SongInfoModal: edits are staged
 * locally and only applied via onSongChange on "업데이트"; "취소" discards
 * them, and the draft re-syncs from the real song every time this opens.
 */
export function SongFormModal({ visible, song, onSongChange, onClose }: SongFormModalProps) {
  const [draft, setDraft] = useState(song);

  useEffect(() => {
    if (visible) setDraft(song);
  }, [visible, song]);

  function commit() {
    onSongChange(draft);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>송폼 편집</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            {draft.sectionMarkers.length === 0 ? (
              <Text style={styles.emptyText}>
                등록된 섹션 라벨이 없습니다. 악보를 탭해 "+ 섹션 라벨"로 추가하세요.
              </Text>
            ) : (
              draft.sectionMarkers.map((marker) => (
                <View key={marker.id} style={styles.markerRow}>
                  <TextInput
                    style={styles.markerInput}
                    value={marker.label}
                    onChangeText={(label) => setDraft((prev) => updateSectionMarker(prev, marker.id, { label }))}
                  />
                  <Pressable
                    style={styles.markerDeleteButton}
                    onPress={() => setDraft((prev) => removeSectionMarker(prev, marker.id))}
                  >
                    <Text style={styles.markerDeleteButtonText}>삭제</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.updateButton} onPress={commit}>
              <Text style={styles.updateButtonText}>업데이트</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    color: "#666",
  },
  markerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  markerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  markerDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fdecea",
  },
  markerDeleteButtonText: {
    fontWeight: "700",
    color: "#c0392b",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  cancelButtonText: {
    fontWeight: "700",
    color: "#333",
  },
  updateButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
  },
  updateButtonText: {
    fontWeight: "700",
    color: "#fff",
  },
});
