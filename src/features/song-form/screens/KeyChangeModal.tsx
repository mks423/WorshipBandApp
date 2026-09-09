import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { CHROMATIC_KEYS, semitonesBetweenKeys, transposeChord, transposeSong, transposeSongToKey } from "../../transpose";
import type { Song } from "../../../types/song";

interface KeyChangeModalProps {
  visible: boolean;
  song: Song;
  onSongChange: (song: Song) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet modal for adjusting a song's key. Every tap calls
 * `onSongChange` immediately, so the source overlay underneath updates in
 * real time as the user steps semitones or jumps to a key.
 */
export function KeyChangeModal({ visible, song, onSongChange, onClose }: KeyChangeModalProps) {
  const currentKey = song.originalKey ? transposeChord(song.originalKey, song.transposeSteps) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>키 변경</Text>
          <Text style={styles.subtitle}>
            원key {song.originalKey ?? "알 수 없음"} · 현재 키 {currentKey ?? "알 수 없음"}
          </Text>

          <View style={styles.stepperRow}>
            <Pressable style={styles.stepperButton} onPress={() => onSongChange(transposeSong(song, -1))}>
              <Text style={styles.stepperButtonText}>- 반음</Text>
            </Pressable>
            <Text style={styles.stepperLabel}>
              원key 대비 {song.transposeSteps >= 0 ? "+" : ""}
              {song.transposeSteps}
            </Text>
            <Pressable style={styles.stepperButton} onPress={() => onSongChange(transposeSong(song, 1))}>
              <Text style={styles.stepperButtonText}>+ 반음</Text>
            </Pressable>
          </View>

          {currentKey && (
            <View style={styles.keyGrid}>
              {CHROMATIC_KEYS.map((key) => {
                const active = semitonesBetweenKeys(currentKey, key) === 0;
                return (
                  <Pressable
                    key={key}
                    style={[styles.keyButton, active && styles.keyButtonActive]}
                    onPress={() => onSongChange(transposeSongToKey(song, currentKey, key))}
                  >
                    <Text style={[styles.keyButtonText, active && styles.keyButtonTextActive]}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>완료</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
  },
  stepperButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#2f6feb",
    borderRadius: 8,
  },
  stepperButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  stepperLabel: {
    fontWeight: "600",
  },
  keyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keyButton: {
    minWidth: 48,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  keyButtonActive: {
    backgroundColor: "#2f6feb",
    borderColor: "#2f6feb",
  },
  keyButtonText: {
    fontWeight: "600",
    color: "#333",
  },
  keyButtonTextActive: {
    color: "#fff",
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
