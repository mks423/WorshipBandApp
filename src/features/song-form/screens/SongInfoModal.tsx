import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CHROMATIC_KEYS, semitonesBetweenKeys, transposeChord, transposeSong, transposeSongToKey } from "../../transpose";
import type { Song } from "../../../types/song";

interface SongInfoModalProps {
  visible: boolean;
  song: Song;
  onSongChange: (song: Song) => void;
  onClose: () => void;
}

/**
 * One place to edit everything about a song that isn't the chart itself:
 * title, BPM, the detected original key (a guess from the first chord —
 * see detectOriginalKey — so it needs to be correctable by hand when it
 * guessed wrong), and transposing to a different key.
 *
 * Correcting the original key is a plain metadata fix, not a transpose: it
 * only relabels what key the chart was already written in, so it leaves
 * every chord and transposeSteps untouched. Transposing (the stepper/grid
 * below it) is the opposite — it rewrites every chord and leaves
 * originalKey alone as the fixed reference point.
 */
export function SongInfoModal({ visible, song, onSongChange, onClose }: SongInfoModalProps) {
  const [correctingOriginalKey, setCorrectingOriginalKey] = useState(false);
  const currentKey = song.originalKey ? transposeChord(song.originalKey, song.transposeSteps) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>곡 정보</Text>

            <Text style={styles.fieldLabel}>곡 제목</Text>
            <TextInput
              style={styles.textInput}
              value={song.title}
              onChangeText={(title) => onSongChange({ ...song, title })}
              placeholder="곡 제목"
            />

            <Text style={styles.fieldLabel}>BPM</Text>
            <TextInput
              style={styles.textInput}
              value={song.bpm !== null ? String(song.bpm) : ""}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, "");
                onSongChange({ ...song, bpm: digits.length > 0 ? Number(digits) : null });
              }}
              placeholder="-"
              keyboardType="number-pad"
            />

            <View style={styles.keyHeaderRow}>
              <Text style={styles.fieldLabel}>인식된 키 (원key)</Text>
              <Pressable onPress={() => setCorrectingOriginalKey((prev) => !prev)}>
                <Text style={styles.correctKeyLink}>
                  {correctingOriginalKey ? "닫기" : song.originalKey ? "수정" : "직접 입력"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>원key {song.originalKey ?? "알 수 없음"} · 현재 키 {currentKey ?? "알 수 없음"}</Text>
            {correctingOriginalKey && (
              <>
                <Text style={styles.correctKeyHint}>
                  코드는 그대로 두고 "원래 이 곡의 키가 무엇인지" 표시만 바꿉니다 (전조가 아닙니다)
                </Text>
                <View style={styles.keyGrid}>
                  {CHROMATIC_KEYS.map((key) => (
                    <Pressable
                      key={key}
                      style={[styles.correctKeyButton, song.originalKey === key && styles.correctKeyButtonActive]}
                      onPress={() => {
                        onSongChange({ ...song, originalKey: key });
                        setCorrectingOriginalKey(false);
                      }}
                    >
                      <Text
                        style={[styles.keyButtonText, song.originalKey === key && styles.keyButtonTextActive]}
                      >
                        {key}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, styles.transposeSectionLabel]}>전조</Text>
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
          </ScrollView>

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
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginTop: 8,
    marginBottom: 6,
  },
  transposeSectionLabel: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  keyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  correctKeyLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2f6feb",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  correctKeyHint: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  // Deliberately a different (neutral gray, not the app's blue "primary
  // action" color) look from the transpose grid below — these two grids
  // sit close together and do very different things (relabel vs. actually
  // transpose every chord), so they need to read as visually distinct at a
  // glance, not just by the text above them.
  correctKeyButton: {
    minWidth: 48,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  correctKeyButtonActive: {
    backgroundColor: "#555",
    borderColor: "#555",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
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
    marginBottom: 8,
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
    marginTop: 8,
  },
  doneButtonText: {
    fontWeight: "700",
  },
});
