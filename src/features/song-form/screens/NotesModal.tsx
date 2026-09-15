import { Modal, Pressable, StyleSheet, Text, TextInput } from "react-native";

import type { Song } from "../../../types/song";

interface NotesModalProps {
  visible: boolean;
  song: Song;
  onSongChange: (song: Song) => void;
  onClose: () => void;
}

/** Freeform notes for a song — a sermon theme, talking points, or anything else worth keeping alongside the chart. */
export function NotesModal({ visible, song, onSongChange, onClose }: NotesModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>주제 말씀 / 나눔 메모</Text>
          <TextInput
            style={styles.notesInput}
            value={song.notes}
            onChangeText={(notes) => onSongChange({ ...song, notes })}
            placeholder="이 곡과 함께 나눌 말씀이나 이야기를 적어두세요"
            multiline
            textAlignVertical="top"
            autoFocus
          />
          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>완료</Text>
          </Pressable>
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
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  notesInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  doneButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  doneButtonText: {
    fontWeight: "700",
  },
});
