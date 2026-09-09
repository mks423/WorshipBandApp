import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { Song } from "../../../types/song";

interface SongListScreenProps {
  songs: Song[];
  onSelect: (index: number) => void;
  onRescan: () => void;
}

/**
 * Shown right after scanning multiple files/pages: one row per scanned
 * song, each already OCR'd — pressing "선택" goes straight into that song's
 * source-overlay view (chords redrawn on the original chart), with no
 * extra confirmation step.
 */
export function SongListScreen({ songs, onSelect, onRescan }: SongListScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>스캔 결과 ({songs.length}곡)</Text>
      <FlatList
        contentContainerStyle={styles.list}
        data={songs}
        keyExtractor={(song) => song.id}
        renderItem={({ item, index }) => {
          const groupSize = item.groupId ? songs.filter((s) => s.groupId === item.groupId).length : 1;
          const label = item.groupId ? `${item.title} (${item.pageNumber}/${groupSize}쪽)` : item.title;
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {index + 1}. {label}
                </Text>
                <Text style={styles.rowKey}>인식된 키: {item.originalKey ?? "알 수 없음"}</Text>
              </View>
              <Pressable style={styles.editButton} onPress={() => onSelect(index)}>
                <Text style={styles.editButtonText}>선택</Text>
              </Pressable>
            </View>
          );
        }}
      />
      <Pressable style={styles.rescanButton} onPress={onRescan}>
        <Text style={styles.rescanButtonText}>새로 스캔하기</Text>
      </Pressable>
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
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    padding: 12,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
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
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  rescanButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  rescanButtonText: {
    fontWeight: "700",
  },
});
