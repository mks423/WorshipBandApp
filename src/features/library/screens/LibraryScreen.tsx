import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ConfirmModal } from "../../song-form";
import type { Song } from "../../../types/song";
import { groupSongs } from "../groupSongs";

interface LibraryScreenProps {
  songs: Song[];
  /** Called with a song's id, or a multi-page document's groupId, when the user picks it. */
  onSelect: (key: string) => void;
  /** Called with a song's id, or a multi-page document's groupId (deleting every page), when confirmed. */
  onDelete: (key: string) => void;
  onScan: () => void;
}

/**
 * Home screen listing every song saved to the device so far. This is what a
 * relaunch lands on once anything has been scanned — the scan flow itself
 * stays a separate action ("새로 스캔하기") rather than the default entry
 * point, so previously reviewed charts don't need to be re-scanned to see
 * them again. Pages that came from the same imported PDF show as one row.
 */
export function LibraryScreen({ songs, onSelect, onDelete, onScan }: LibraryScreenProps) {
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const groups = groupSongs(songs);
  const pendingDeleteGroup = groups.find((g) => g.key === pendingDeleteKey);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>내 악보 ({groups.length}곡)</Text>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>저장된 악보가 없습니다. 악보를 스캔해서 추가해보세요.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={groups}
          keyExtractor={(group) => group.key}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable style={styles.rowInfo} onPress={() => onSelect(item.key)}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowKey}>
                  인식된 키: {item.originalKey ?? "알 수 없음"}
                  {item.pageCount > 1 ? ` · ${item.pageCount}페이지` : ""}
                </Text>
              </Pressable>
              <Pressable style={styles.selectButton} onPress={() => onSelect(item.key)}>
                <Text style={styles.selectButtonText}>선택</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => setPendingDeleteKey(item.key)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable style={styles.scanButton} onPress={onScan}>
        <Text style={styles.scanButtonText}>새로 스캔하기</Text>
      </Pressable>

      <ConfirmModal
        visible={pendingDeleteKey !== null}
        title="악보 삭제"
        message={
          pendingDeleteGroup && pendingDeleteGroup.pageCount > 1
            ? `"${pendingDeleteGroup.title}" (${pendingDeleteGroup.pageCount}페이지)을(를) 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
            : `"${pendingDeleteGroup?.title ?? ""}"을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
        }
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          if (pendingDeleteKey) onDelete(pendingDeleteKey);
          setPendingDeleteKey(null);
        }}
        onCancel={() => setPendingDeleteKey(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowKey: {
    fontSize: 13,
    color: "#888",
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
  },
  selectButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5e3e1",
  },
  deleteButtonText: {
    color: "#c0392b",
    fontWeight: "700",
  },
  scanButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  scanButtonText: {
    fontWeight: "700",
  },
});
