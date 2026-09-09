import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ConfirmModal } from "../../song-form";
import type { Setlist } from "../../../types/setlist";

interface SetlistListScreenProps {
  setlists: Setlist[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

/** Lists every saved song form (송폼) — a setlist saved once can be reopened here to reuse or update, rather than rebuilding the running order from scratch each time. */
export function SetlistListScreen({ setlists, onSelect, onCreate, onDelete }: SetlistListScreenProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const sorted = [...setlists].sort((a, b) => b.updatedAt - a.updatedAt);
  const pendingDeleteTitle = setlists.find((s) => s.id === pendingDeleteId)?.title ?? "";

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>송폼 ({setlists.length})</Text>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>저장된 송폼이 없습니다. 새로 만들어보세요.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={sorted}
          keyExtractor={(setlist) => setlist.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable style={styles.rowInfo} onPress={() => onSelect(item.id)}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title || "제목 없는 송폼"}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.songIds.length}곡 · {formatDate(item.updatedAt)}
                </Text>
              </Pressable>
              <Pressable style={styles.selectButton} onPress={() => onSelect(item.id)}>
                <Text style={styles.selectButtonText}>열기</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => setPendingDeleteId(item.id)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable style={styles.createButton} onPress={onCreate}>
        <Text style={styles.createButtonText}>+ 새 송폼 만들기</Text>
      </Pressable>

      <ConfirmModal
        visible={pendingDeleteId !== null}
        title="송폼 삭제"
        message={`"${pendingDeleteTitle}"을(를) 삭제할까요? 여기 포함된 곡들은 라이브러리에 그대로 남습니다.`}
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
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
  rowMeta: {
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
  createButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  createButtonText: {
    fontWeight: "700",
  },
});
