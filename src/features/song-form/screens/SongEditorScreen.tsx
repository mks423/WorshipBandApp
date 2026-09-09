import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { transposeChord } from "../../transpose";
import type { Song } from "../../../types/song";
import { alertCompat } from "../../../utils/alertCompat";
import { exportPageAsImage, exportPageAsPdf } from "../exportSong";
import { ExportModal } from "./ExportModal";
import { KeyChangeModal } from "./KeyChangeModal";
import { NotesModal } from "./NotesModal";
import { SourceOverlayScreen } from "./SourceOverlayScreen";

interface SongEditorScreenProps {
  song: Song;
  onSongChange: (song: Song) => void;
  onDone: () => void;
  /** Label for the bottom-bar "done" button — differs by how this screen was reached (e.g. "목록으로" from a multi-song batch, "완료" otherwise). */
  doneLabel?: string;
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
  doneLabel = "완료",
  pageIndex,
  pageCount,
  onNavigatePage,
}: SongEditorScreenProps) {
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const overlayRef = useRef<View>(null);
  const showPageNav = pageCount !== undefined && pageCount > 1 && pageIndex !== undefined;

  async function handleExport(kind: "image" | "pdf") {
    setExporting(true);
    try {
      if (kind === "image") {
        await exportPageAsImage(overlayRef, song.title);
      } else {
        await exportPageAsPdf(overlayRef, song.title);
      }
      setExportModalVisible(false);
    } catch (error) {
      alertCompat("내보내기 실패", error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }

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
          <Pressable onPress={() => setNotesModalVisible(true)}>
            <Text style={[styles.keyInfoText, styles.notesLink]}>
              {song.notes.trim().length > 0 ? "메모 있음" : "+ 메모"}
            </Text>
          </Pressable>
        </View>
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

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomButton} onPress={() => setKeyModalVisible(true)}>
          <Text style={styles.bottomButtonText}>편집</Text>
        </Pressable>
        {song.sourceImage && (
          <Pressable style={styles.bottomButton} onPress={() => setExportModalVisible(true)}>
            <Text style={styles.bottomButtonText}>내보내기</Text>
          </Pressable>
        )}
        <Pressable style={styles.bottomButton} onPress={onDone}>
          <Text style={styles.bottomButtonText}>{doneLabel}</Text>
        </Pressable>
      </View>

      <KeyChangeModal
        visible={keyModalVisible}
        song={song}
        onSongChange={onSongChange}
        onClose={() => setKeyModalVisible(false)}
      />

      <ExportModal
        visible={exportModalVisible}
        exporting={exporting}
        onExportImage={() => handleExport("image")}
        onExportPdf={() => handleExport("pdf")}
        onClose={() => setExportModalVisible(false)}
      />

      <NotesModal
        visible={notesModalVisible}
        song={song}
        onSongChange={onSongChange}
        onClose={() => setNotesModalVisible(false)}
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
  notesLink: {
    color: "#2f6feb",
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
