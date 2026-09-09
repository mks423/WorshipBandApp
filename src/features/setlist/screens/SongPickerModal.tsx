import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { groupSongs } from "../../library/groupSongs";
import type { Song } from "../../../types/song";

interface SongPickerModalProps {
  visible: boolean;
  /** The full library — rows already in the setlist (matched by key) are hidden so the same song can't be added twice. */
  songs: Song[];
  excludeKeys: string[];
  onPick: (key: string) => void;
  onClose: () => void;
}

/** Bottom-sheet list of library songs (grouped the same way as the library home screen) to add to a song form. */
export function SongPickerModal({ visible, songs, excludeKeys, onPick, onClose }: SongPickerModalProps) {
  const excluded = new Set(excludeKeys);
  const groups = groupSongs(songs).filter((group) => !excluded.has(group.key));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>곡 추가</Text>

          {groups.length === 0 ? (
            <Text style={styles.emptyText}>추가할 수 있는 곡이 없습니다.</Text>
          ) : (
            <FlatList
              style={styles.list}
              data={groups}
              keyExtractor={(group) => group.key}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => onPick(item.key)}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowKey}>{item.originalKey ?? "알 수 없음"}</Text>
                </Pressable>
              )}
            />
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
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
    maxHeight: "75%",
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
  emptyText: {
    color: "#888",
    paddingVertical: 12,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    marginRight: 12,
  },
  rowKey: {
    fontSize: 13,
    color: "#888",
  },
  closeButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  closeButtonText: {
    fontWeight: "700",
  },
});
