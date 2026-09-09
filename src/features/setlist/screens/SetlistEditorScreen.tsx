import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { groupSongs } from "../../library/groupSongs";
import { ConfirmModal } from "../../song-form";
import type { Song } from "../../../types/song";
import type { Setlist } from "../../../types/setlist";
import { SongPickerModal } from "./SongPickerModal";

interface SetlistEditorScreenProps {
  setlist: Setlist;
  /** The whole library, to resolve each songId in the setlist to its title/key. */
  librarySongs: Song[];
  onChange: (setlist: Setlist) => void;
  onOpenSong: (key: string) => void;
  onClose: () => void;
}

/**
 * Edits one song form (송폼): its title and running order. Songs are
 * referenced by the same key the library groups by (a song's id, or a
 * multi-page document's groupId) — opening one hands that key straight to
 * the same "open from library" flow the library screen uses, so a set can
 * be replayed exactly like reopening a saved chart directly.
 */
export function SetlistEditorScreen({ setlist, librarySongs, onChange, onOpenSong, onClose }: SetlistEditorScreenProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);

  const groupsByKey = new Map(groupSongs(librarySongs).map((group) => [group.key, group]));
  const rows = setlist.songIds
    .map((key) => ({ key, group: groupsByKey.get(key) }))
    .filter((row): row is { key: string; group: NonNullable<(typeof row)["group"]> } => row.group !== undefined);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= setlist.songIds.length) return;
    const songIds = [...setlist.songIds];
    [songIds[index], songIds[target]] = [songIds[target], songIds[index]];
    onChange({ ...setlist, songIds });
  }

  function addSong(key: string) {
    onChange({ ...setlist, songIds: [...setlist.songIds, key] });
    setPickerVisible(false);
  }

  function removeSong(key: string) {
    onChange({ ...setlist, songIds: setlist.songIds.filter((id) => id !== key) });
    setPendingRemoveKey(null);
  }

  const pendingRemoveTitle = groupsByKey.get(pendingRemoveKey ?? "")?.title ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          value={setlist.title}
          onChangeText={(title) => onChange({ ...setlist, title })}
          placeholder="송폼 이름 (예: 3월 3주 주일예배)"
        />
        <Text style={styles.subtitle}>{rows.length}곡</Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 추가된 곡이 없습니다. "곡 추가"로 시작해보세요.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rowIndex}>{index + 1}</Text>
              <Pressable style={styles.rowInfo} onPress={() => onOpenSong(item.key)}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.group.title}
                </Text>
                <Text style={styles.rowKey}>{item.group.originalKey ?? "알 수 없음"}</Text>
              </Pressable>
              <View style={styles.rowActions}>
                <Pressable
                  style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                  disabled={index === 0}
                  onPress={() => move(index, -1)}
                >
                  <Text style={styles.moveButtonText}>▲</Text>
                </Pressable>
                <Pressable
                  style={[styles.moveButton, index === rows.length - 1 && styles.moveButtonDisabled]}
                  disabled={index === rows.length - 1}
                  onPress={() => move(index, 1)}
                >
                  <Text style={styles.moveButtonText}>▼</Text>
                </Pressable>
                <Pressable style={styles.removeButton} onPress={() => setPendingRemoveKey(item.key)}>
                  <Text style={styles.removeButtonText}>제거</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomButton} onPress={() => setPickerVisible(true)}>
          <Text style={styles.bottomButtonText}>+ 곡 추가</Text>
        </Pressable>
        <Pressable style={styles.bottomButton} onPress={onClose}>
          <Text style={styles.bottomButtonText}>완료</Text>
        </Pressable>
      </View>

      <SongPickerModal
        visible={pickerVisible}
        songs={librarySongs}
        excludeKeys={setlist.songIds}
        onPick={addSong}
        onClose={() => setPickerVisible(false)}
      />

      <ConfirmModal
        visible={pendingRemoveKey !== null}
        title="곡 제거"
        message={`"${pendingRemoveTitle}"을(를) 이 송폼에서 제거할까요? (라이브러리에서 삭제되지는 않습니다)`}
        confirmLabel="제거"
        destructive
        onConfirm={() => {
          if (pendingRemoveKey) removeSong(pendingRemoveKey);
        }}
        onCancel={() => setPendingRemoveKey(null)}
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
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
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
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  rowIndex: {
    width: 20,
    textAlign: "center",
    fontWeight: "700",
    color: "#999",
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowKey: {
    fontSize: 12,
    color: "#888",
  },
  rowActions: {
    flexDirection: "row",
    gap: 4,
  },
  moveButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  moveButtonDisabled: {
    opacity: 0.35,
  },
  moveButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  removeButton: {
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#f5e3e1",
  },
  removeButtonText: {
    color: "#c0392b",
    fontWeight: "700",
    fontSize: 12,
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
