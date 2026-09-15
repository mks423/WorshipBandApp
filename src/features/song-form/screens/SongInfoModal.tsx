import { useEffect, useState } from "react";
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
 * One place to edit everything about a song that isn't the chart content
 * itself: title, BPM, the detected original key (a guess from the first
 * chord — see detectOriginalKey — so it needs to be correctable by hand
 * when it guessed wrong), transposing to a different key, and renaming or
 * removing existing Verse/Chorus/Bridge-style section markers (placing a
 * *new* one still happens by tapping the chart directly, since that needs
 * a screen position this modal has no way to capture).
 *
 * Edits are staged locally and only committed to the real song on
 * "업데이트" — "취소" (or the backdrop/back button) discards them — so
 * changes here don't leak into the chart underneath until confirmed.
 *
 * Correcting the original key is a plain metadata fix, not a transpose: it
 * only relabels what key the chart was already written in, leaving every
 * chord and transposeSteps untouched. Transposing (the stepper/grid below
 * it) is the opposite — it rewrites every chord and leaves originalKey
 * fixed as the reference point.
 */
export function SongInfoModal({ visible, song, onSongChange, onClose }: SongInfoModalProps) {
  const [draft, setDraft] = useState(song);
  const [correctingOriginalKey, setCorrectingOriginalKey] = useState(false);

  // Re-sync the draft to the real song each time the modal opens, so a
  // cancelled edit never carries over into the next time it's opened.
  useEffect(() => {
    if (visible) {
      setDraft(song);
      setCorrectingOriginalKey(false);
    }
  }, [visible, song]);

  const currentKey = draft.originalKey ? transposeChord(draft.originalKey, draft.transposeSteps) : null;

  function commit() {
    onSongChange(draft);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>곡 정보</Text>

            <Text style={styles.fieldLabel}>곡 제목</Text>
            <TextInput
              style={styles.textInput}
              value={draft.title}
              onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))}
              placeholder="곡 제목"
            />

            <Text style={styles.fieldLabel}>BPM</Text>
            <TextInput
              style={styles.textInput}
              value={draft.bpm !== null ? String(draft.bpm) : ""}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, "");
                setDraft((prev) => ({ ...prev, bpm: digits.length > 0 ? Number(digits) : null }));
              }}
              placeholder="-"
              keyboardType="number-pad"
            />

            <View style={styles.keyHeaderRow}>
              <Text style={styles.fieldLabel}>인식된 키 (원key)</Text>
              <Pressable onPress={() => setCorrectingOriginalKey((prev) => !prev)}>
                <Text style={styles.correctKeyLink}>
                  {correctingOriginalKey ? "닫기" : draft.originalKey ? "수정" : "직접 입력"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              원key {draft.originalKey ?? "알 수 없음"} · 현재 키 {currentKey ?? "알 수 없음"}
            </Text>
            {correctingOriginalKey && (
              <>
                <Text style={styles.correctKeyHint}>
                  코드는 그대로 두고 "원래 이 곡의 키가 무엇인지" 표시만 바꿉니다 (전조가 아닙니다)
                </Text>
                <View style={styles.keyGrid}>
                  {CHROMATIC_KEYS.map((key) => (
                    <Pressable
                      key={key}
                      style={[styles.correctKeyButton, draft.originalKey === key && styles.correctKeyButtonActive]}
                      onPress={() => {
                        setDraft((prev) => ({ ...prev, originalKey: key }));
                        setCorrectingOriginalKey(false);
                      }}
                    >
                      <Text
                        style={[styles.keyButtonText, draft.originalKey === key && styles.keyButtonTextActive]}
                      >
                        {key}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, styles.sectionDivider]}>전조</Text>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepperButton} onPress={() => setDraft((prev) => transposeSong(prev, -1))}>
                <Text style={styles.stepperButtonText}>- 반음</Text>
              </Pressable>
              <Text style={styles.stepperLabel}>
                원key 대비 {draft.transposeSteps >= 0 ? "+" : ""}
                {draft.transposeSteps}
              </Text>
              <Pressable style={styles.stepperButton} onPress={() => setDraft((prev) => transposeSong(prev, 1))}>
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
                      onPress={() => setDraft((prev) => transposeSongToKey(prev, currentKey, key))}
                    >
                      <Text style={[styles.keyButtonText, active && styles.keyButtonTextActive]}>{key}</Text>
                    </Pressable>
                  );
                })}
              </View>
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
        </View>
      </View>
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
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginTop: 8,
    marginBottom: 6,
  },
  sectionDivider: {
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
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
