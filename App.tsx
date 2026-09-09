import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { ScanScreen } from "./src/features/chord-scan";
import { SongEditorScreen, SongListScreen } from "./src/features/song-form";
import type { Song } from "./src/types/song";

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleScanned(scanned: Song[]) {
    setSongs(scanned);
    // A single scanned song goes straight to its editor; multiple songs go
    // through the results list so each can be opened/edited individually.
    setEditingIndex(scanned.length === 1 ? 0 : null);
  }

  function updateSong(index: number, updated: Song) {
    setSongs((prev) => prev.map((song, i) => (i === index ? updated : song)));
  }

  function backToScan() {
    setSongs([]);
    setEditingIndex(null);
  }

  let content;
  if (songs.length === 0) {
    content = <ScanScreen onSongsScanned={handleScanned} />;
  } else if (editingIndex === null) {
    content = <SongListScreen songs={songs} onSelect={setEditingIndex} onRescan={backToScan} />;
  } else {
    content = (
      <SongEditorScreen
        song={songs[editingIndex]}
        onSongChange={(song) => updateSong(editingIndex, song)}
        onDone={() => (songs.length > 1 ? setEditingIndex(null) : backToScan())}
        doneLabel={songs.length > 1 ? "목록으로" : "다시 스캔하기"}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {content}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
