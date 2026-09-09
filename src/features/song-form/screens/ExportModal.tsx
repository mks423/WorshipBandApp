import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface ExportModalProps {
  visible: boolean;
  exporting: boolean;
  onExportImage: () => void;
  onExportPdf: () => void;
  onClose: () => void;
}

/** Lets the current page be saved/shared as a PNG or a PDF. */
export function ExportModal({ visible, exporting, onExportImage, onExportPdf, onClose }: ExportModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>내보내기</Text>
          <Text style={styles.subtitle}>지금 보이는 페이지를 코드가 반영된 상태로 내보냅니다</Text>

          {exporting ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <>
              <Pressable style={styles.option} onPress={onExportImage}>
                <Text style={styles.optionText}>이미지로 저장/공유 (PNG)</Text>
              </Pressable>
              <Pressable style={styles.option} onPress={onExportPdf}>
                <Text style={styles.optionText}>PDF로 저장/공유</Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.doneButton} onPress={onClose} disabled={exporting}>
            <Text style={styles.doneButtonText}>닫기</Text>
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
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
  },
  spinner: {
    paddingVertical: 20,
  },
  option: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
  },
  optionText: {
    color: "#fff",
    fontWeight: "700",
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
