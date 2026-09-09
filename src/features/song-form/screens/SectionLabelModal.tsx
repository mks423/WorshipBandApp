import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

/** Common worship-chart section names, matching what the OCR pipeline already recognizes as section labels (see classifyLines.ts). */
const PRESET_LABELS = [
  "Verse 1",
  "Verse 2",
  "Verse 3",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Intro",
  "Interlude",
  "Outro",
];

interface SectionLabelModalProps {
  visible: boolean;
  /** Present when editing an existing marker (prefills the label and shows a delete option); absent when placing a new one. */
  initialLabel?: string;
  onConfirm: (label: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Picks a Verse/Chorus/Bridge-style label for a section marker, from a preset list or typed in by hand ("라벨 등록"). */
export function SectionLabelModal({ visible, initialLabel, onConfirm, onDelete, onClose }: SectionLabelModalProps) {
  const [customLabel, setCustomLabel] = useState(initialLabel ?? "");

  useEffect(() => {
    if (visible) setCustomLabel(initialLabel ?? "");
  }, [visible, initialLabel]);

  function confirm(label: string) {
    const trimmed = label.trim();
    if (trimmed.length === 0) return;
    onConfirm(trimmed);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{initialLabel ? "섹션 라벨 수정" : "섹션 라벨 추가"}</Text>

          <View style={styles.presetGrid}>
            {PRESET_LABELS.map((label) => (
              <Pressable key={label} style={styles.presetButton} onPress={() => confirm(label)}>
                <Text style={styles.presetButtonText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="직접 입력 (예: 후렴 2)"
              onSubmitEditing={() => confirm(customLabel)}
            />
            <Pressable style={styles.customConfirmButton} onPress={() => confirm(customLabel)}>
              <Text style={styles.customConfirmButtonText}>확인</Text>
            </Pressable>
          </View>

          {onDelete && (
            <Pressable style={styles.deleteButton} onPress={onDelete}>
              <Text style={styles.deleteButtonText}>이 라벨 삭제</Text>
            </Pressable>
          )}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>취소</Text>
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
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0e9ff",
  },
  presetButtonText: {
    color: "#6b3fd4",
    fontWeight: "700",
    fontSize: 13,
  },
  customRow: {
    flexDirection: "row",
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customConfirmButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#6b3fd4",
  },
  customConfirmButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f5e3e1",
  },
  deleteButtonText: {
    color: "#c0392b",
    fontWeight: "700",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  cancelButtonText: {
    fontWeight: "700",
  },
});
