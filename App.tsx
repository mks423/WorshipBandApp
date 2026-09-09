import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";

import { ScanScreen } from "./src/features/chord-scan";
import { LibraryScreen, deleteSongs, loadLibrary, upsertSong, upsertSongs } from "./src/features/library";
import { SongEditorScreen, SongListScreen } from "./src/features/song-form";
import type { Song } from "./src/types/song";

export default function App() {
  const [library, setLibrary] = useState<Song[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Songs saved on a previous run need to survive a relaunch — this app has
  // no server, so the whole library lives in on-device storage.
  useEffect(() => {
    loadLibrary().then((loaded) => {
      setLibrary(loaded);
      setLibraryReady(true);
    });
  }, []);

  async function handleScanned(scanned: Song[]) {
    const durableSongs = await upsertSongs(scanned);
    setLibrary((prev) => mergeSongs(prev, durableSongs));
    setSongs(durableSongs);
    setShowScan(false);
    // A single scanned song goes straight to its editor; multiple songs go
    // through the results list so each can be opened/edited individually.
    setEditingIndex(durableSongs.length === 1 ? 0 : null);
  }

  function updateSong(index: number, updated: Song) {
    setSongs((prev) => prev.map((song, i) => (i === index ? updated : song)));
    upsertSong(updated).then((durable) => {
      setLibrary((prev) => mergeSongs(prev, [durable]));
    });
  }

  /** `key` is a song's id, or a multi-page document's shared groupId — opens every page of that document together, sorted by pageNumber, so page-flip navigation works exactly like a fresh scan. */
  function openFromLibrary(key: string) {
    const groupSongs = library
      .filter((s) => (s.groupId ?? s.id) === key)
      .sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
    if (groupSongs.length === 0) return;
    setSongs(groupSongs);
    setEditingIndex(0);
  }

  async function handleDelete(key: string) {
    const ids = library.filter((s) => (s.groupId ?? s.id) === key).map((s) => s.id);
    await deleteSongs(ids);
    setLibrary((prev) => prev.filter((s) => !ids.includes(s.id)));
  }

  function backToLibrary() {
    setSongs([]);
    setEditingIndex(null);
    setShowScan(false);
  }

  function startNewScan() {
    setSongs([]);
    setEditingIndex(null);
    setShowScan(true);
  }

  // Lets a multi-page scan (e.g. a 5-page PDF) be flipped through from
  // inside the editor itself — no need to back out to the list between pages.
  function navigatePage(delta: number) {
    setEditingIndex((prev) => {
      if (prev === null) return prev;
      const next = prev + delta;
      return next >= 0 && next < songs.length ? next : prev;
    });
  }

  let content;
  if (!libraryReady) {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  } else if (songs.length === 0) {
    content = showScan ? (
      <ScanScreen onSongsScanned={handleScanned} />
    ) : (
      <LibraryScreen songs={library} onSelect={openFromLibrary} onDelete={handleDelete} onScan={() => setShowScan(true)} />
    );
  } else if (editingIndex === null) {
    content = <SongListScreen songs={songs} onSelect={setEditingIndex} onRescan={startNewScan} />;
  } else {
    content = (
      <SongEditorScreen
        song={songs[editingIndex]}
        onSongChange={(song) => updateSong(editingIndex, song)}
        onDone={() => (songs.length > 1 ? setEditingIndex(null) : backToLibrary())}
        doneLabel={songs.length > 1 ? "목록으로" : "완료"}
        pageIndex={editingIndex}
        pageCount={songs.length}
        onNavigatePage={navigatePage}
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

/** Merges `updates` into `existing` by song id — updates replace in place (keeping list order), brand-new songs append at the end. */
function mergeSongs(existing: Song[], updates: Song[]): Song[] {
  const byId = new Map(existing.map((song) => [song.id, song]));
  for (const song of updates) byId.set(song.id, song);
  return [...byId.values()];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
