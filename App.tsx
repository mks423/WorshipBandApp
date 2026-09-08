import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { ScanScreen } from "./src/features/chord-scan";
import { SongEditorScreen } from "./src/features/song-form";
import type { Song } from "./src/types/song";

export default function App() {
  const [song, setSong] = useState<Song | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      {song ? (
        <SongEditorScreen song={song} onSongChange={setSong} onDone={() => setSong(null)} />
      ) : (
        <ScanScreen onSongScanned={setSong} />
      )}
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
