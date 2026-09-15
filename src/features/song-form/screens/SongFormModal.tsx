import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { addSectionMarker, moveSectionMarker, removeSectionMarker, updateSectionMarker } from "../editSong";
import { getSectionLabelColor } from "../sectionLabelColors";
import type { Song } from "../../../types/song";
import { SectionLabelModal } from "./SectionLabelModal";

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
 * The list order *is* the performance order (there's no separate chart
 * position driving it), so markers are freely reorderable with the ▲/▼
 * buttons and the same label can be added more than once (e.g. a song with
 * two separate Chorus sections) — adding just appends a new entry.
 *
 * Same draft-then-commit pattern as SongInfoModal: edits are staged
 * locally and only applied via onSongChange on "업데이트"; "취소" discards
 * them, and the draft re-syncs from the real song every time this opens.
 */
export function SongFormModal({ visible, song, onSongChange, onClose }: SongFormModalProps) {
  const [draft, setDraft] = useState(song);
  const [addingLabel, setAddingLabel] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(song);
      setAddingLabel(false);
    }
  }, [visible, song]);

  function commit() {
    onSongChange(draft);
    onClose();
  }

  const markers = draft.sectionMarkers;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>송폼 편집</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            {markers.length === 0 ? (
              <Text style={styles.emptyText}>등록된 송폼이 없습니다. 아래 "+ 추가"로 곡의 구조를 등록하세요.</Text>
            ) : (
              markers.map((marker, i) => (
                <View key={marker.id} style={styles.markerRow}>
                  <View style={styles.reorderColumn}>
                    <Pressable
                      style={[styles.reorderButton, i === 0 && styles.reorderButtonDisabled]}
                      disabled={i === 0}
                      onPress={() => setDraft((prev) => moveSectionMarker(prev, marker.id, -1))}
                    >
                      <Text style={styles.reorderButtonText}>▲</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.reorderButton, i === markers.length - 1 && styles.reorderButtonDisabled]}
                      disabled={i === markers.length - 1}
                      onPress={() => setDraft((prev) => moveSectionMarker(prev, marker.id, 1))}
                    >
                      <Text style={styles.reorderButtonText}>▼</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.markerSwatch, { backgroundColor: getSectionLabelColor(marker.label) }]} />
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

            <Pressable style={styles.addButton} onPress={() => setAddingLabel(true)}>
              <Text style={styles.addButtonText}>+ 추가</Text>
            </Pressable>
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

      <SectionLabelModal
        visible={addingLabel}
        onConfirm={(label) => {
          setDraft((prev) => addSectionMarker(prev, label));
          setAddingLabel(false);
        }}
        onClose={() => setAddingLabel(false)}
      />
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
  reorderColumn: {
    gap: 2,
  },
  reorderButton: {
    width: 22,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "#eee",
  },
  reorderButtonDisabled: {
    opacity: 0.35,
  },
  reorderButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
  },
  markerSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  addButton: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#eef4ff",
  },
  addButtonText: {
    fontWeight: "700",
    color: "#2f6feb",
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
