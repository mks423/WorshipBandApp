import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { ScanScreen } from "./src/features/chord-scan";
import { LibraryScreen, deleteSongs, loadLibrary, upsertSong, upsertSongs } from "./src/features/library";
import { deleteSetlist, loadSetlists, SetlistEditorScreen, SetlistListScreen, upsertSetlist } from "./src/features/setlist";
import { SongEditorScreen, SongListScreen } from "./src/features/song-form";
import type { Setlist } from "./src/types/setlist";
import { createEmptySetlist } from "./src/types/setlist";
import type { Song } from "./src/types/song";

type HomeTab = "library" | "setlists";

export default function App() {
  const [library, setLibrary] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [homeTab, setHomeTab] = useState<HomeTab>("library");
  const [editingSetlistId, setEditingSetlistId] = useState<string | null>(null);

  // Songs (and song forms) saved on a previous run need to survive a
  // relaunch — this app has no server, so everything lives in on-device
  // storage.
  useEffect(() => {
    Promise.all([loadLibrary(), loadSetlists()]).then(([loadedLibrary, loadedSetlists]) => {
      setLibrary(loadedLibrary);
      setSetlists(loadedSetlists);
      setLibraryReady(true);
    });
  }, []);

  async function handleScanned(scanned: Song[]) {
    const durableSongs = await upsertSongs(scanned);
    setLibrary((prev) => mergeById(prev, durableSongs));
    setSongs(durableSongs);
    setShowScan(false);
    // A single scanned song goes straight to its editor; multiple songs go
    // through the results list so each can be opened/edited individually.
    setEditingIndex(durableSongs.length === 1 ? 0 : null);
  }

  function updateSong(index: number, updated: Song) {
    setSongs((prev) => prev.map((song, i) => (i === index ? updated : song)));
    upsertSong(updated).then((durable) => {
      setLibrary((prev) => mergeById(prev, [durable]));
    });
  }

  /** `key` is a song's id, or a multi-page document's shared groupId — opens every page of that document together, sorted by pageNumber, so page-flip navigation works exactly like a fresh scan. */
  function openSongByKey(key: string) {
    const groupSongs = library
      .filter((s) => (s.groupId ?? s.id) === key)
      .sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
    if (groupSongs.length === 0) return;
    setSongs(groupSongs);
    setEditingIndex(0);
  }

  /** Opening straight from the library tab isn't "inside" any song form, so pressing done afterward should land back on the plain library home, not snap back to whatever song form happened to be open earlier. */
  function openFromLibrary(key: string) {
    setEditingSetlistId(null);
    openSongByKey(key);
  }

  /** Opening from within a song form keeps that form's id set, so finishing the song returns to the same form instead of the library home — reopening a saved set feels like resuming it, not leaving it. */
  function openSongFromSetlist(key: string) {
    openSongByKey(key);
  }

  async function handleDeleteFromLibrary(key: string) {
    const ids = library.filter((s) => (s.groupId ?? s.id) === key).map((s) => s.id);
    await deleteSongs(ids);
    setLibrary((prev) => prev.filter((s) => !ids.includes(s.id)));
  }

  function updateSetlist(updated: Setlist) {
    setSetlists((prev) => mergeById(prev, [updated]));
    upsertSetlist(updated).then((durable) => {
      setSetlists((prev) => mergeById(prev, [durable]));
    });
  }

  function createSetlist() {
    const created = createEmptySetlist("새 송폼");
    setSetlists((prev) => [...prev, created]);
    upsertSetlist(created);
    setEditingSetlistId(created.id);
  }

  async function deleteSetlistById(id: string) {
    await deleteSetlist(id);
    setSetlists((prev) => prev.filter((s) => s.id !== id));
    if (editingSetlistId === id) setEditingSetlistId(null);
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

  const editingSetlist = setlists.find((s) => s.id === editingSetlistId) ?? null;

  let content;
  if (!libraryReady) {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  } else if (songs.length === 0) {
    if (showScan) {
      content = <ScanScreen onSongsScanned={handleScanned} />;
    } else if (editingSetlist) {
      content = (
        <SetlistEditorScreen
          setlist={editingSetlist}
          librarySongs={library}
          onChange={updateSetlist}
          onOpenSong={openSongFromSetlist}
          onClose={() => setEditingSetlistId(null)}
        />
      );
    } else {
      content = (
        <View style={styles.homeContainer}>
          <View style={styles.homeTabs}>
            <Pressable
              style={[styles.homeTabButton, homeTab === "library" && styles.homeTabButtonActive]}
              onPress={() => setHomeTab("library")}
            >
              <Text style={[styles.homeTabText, homeTab === "library" && styles.homeTabTextActive]}>내 악보</Text>
            </Pressable>
            <Pressable
              style={[styles.homeTabButton, homeTab === "setlists" && styles.homeTabButtonActive]}
              onPress={() => setHomeTab("setlists")}
            >
              <Text style={[styles.homeTabText, homeTab === "setlists" && styles.homeTabTextActive]}>송폼</Text>
            </Pressable>
          </View>
          {homeTab === "library" ? (
            <LibraryScreen
              songs={library}
              onSelect={openFromLibrary}
              onDelete={handleDeleteFromLibrary}
              onScan={() => setShowScan(true)}
            />
          ) : (
            <SetlistListScreen
              setlists={setlists}
              onSelect={setEditingSetlistId}
              onCreate={createSetlist}
              onDelete={deleteSetlistById}
            />
          )}
        </View>
      );
    }
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

/** Merges `updates` into `existing` by id — updates replace in place (keeping list order), brand-new entries append at the end. */
function mergeById<T extends { id: string }>(existing: T[], updates: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of updates) byId.set(item.id, item);
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
  homeContainer: {
    flex: 1,
  },
  homeTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  homeTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  homeTabButtonActive: {
    backgroundColor: "#2f6feb",
  },
  homeTabText: {
    fontWeight: "700",
    color: "#333",
  },
  homeTabTextActive: {
    color: "#fff",
  },
});
