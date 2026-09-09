import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { Song } from "../../types/song";

const STORAGE_KEY = "wba.library.v1";

// Built lazily, and only ever on native: expo-file-system's Directory/Paths
// construction isn't backed by a real filesystem on web and throws there, so
// touching it at module scope would crash the app on load for every
// platform, web included.
let _sourcesDir: Directory | null = null;
function getSourcesDir(): Directory {
  if (!_sourcesDir) _sourcesDir = new Directory(Paths.document, "wba-sources");
  return _sourcesDir;
}

/** Reads the whole saved library. Never throws — a corrupt/missing entry just comes back as an empty library. */
export async function loadLibrary(): Promise<Song[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Song[]) : [];
  } catch {
    return [];
  }
}

async function saveLibrary(songs: Song[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

/**
 * Copies a song's source image into the app's permanent document directory,
 * if it isn't already there. Camera/file-picker URIs point at OS-managed
 * cache locations that can be cleared between launches, and a PDF-rasterized
 * page's URI is a large inline base64 data URI that would otherwise get
 * duplicated straight into the persisted library blob every time it's
 * re-saved. Native only — on web the picked URI is already whatever the
 * browser is willing to keep around, and there's no comparable durable
 * filesystem to copy into.
 */
async function ensureDurableImage(song: Song): Promise<Song> {
  if (!song.sourceImage || Platform.OS === "web") return song;
  const { uri } = song.sourceImage;
  const sourcesDir = getSourcesDir();
  if (uri.startsWith(sourcesDir.uri)) return song;

  try {
    if (!sourcesDir.exists) sourcesDir.create({ intermediates: true });

    if (uri.startsWith("data:")) {
      const match = /^data:image\/(\w+);base64,(.*)$/.exec(uri);
      const ext = match?.[1] === "jpeg" ? "jpg" : (match?.[1] ?? "png");
      const base64 = match ? match[2] : uri.slice(uri.indexOf(",") + 1);
      const dest = new File(sourcesDir, `${song.id}.${ext}`);
      dest.create({ intermediates: true, overwrite: true });
      dest.write(base64, { encoding: "base64" });
      return { ...song, sourceImage: { ...song.sourceImage, uri: dest.uri } };
    }

    const source = new File(uri);
    const dest = new File(sourcesDir, `${song.id}${source.extension || ".jpg"}`);
    await source.copy(dest, { overwrite: true });
    return { ...song, sourceImage: { ...song.sourceImage, uri: dest.uri } };
  } catch {
    // Best effort — if copying fails, save the song with its original URI rather than losing it entirely.
    return song;
  }
}

/**
 * Adds or updates one song in the persisted library (matched by id), making
 * its source image durable first. Returns the durable version so the caller
 * can keep its own in-memory copy (e.g. the batch being actively reviewed)
 * pointing at the same permanent URI, instead of re-copying the image file
 * on every subsequent edit.
 */
export async function upsertSong(song: Song): Promise<Song> {
  const durable = await ensureDurableImage(song);
  const library = await loadLibrary();
  const index = library.findIndex((s) => s.id === durable.id);
  const next = index === -1 ? [...library, durable] : library.map((s, i) => (i === index ? durable : s));
  await saveLibrary(next);
  return durable;
}

/** Removes one song from the persisted library. Its durable image file, if any, is left in place (harmless orphaned file, not worth the extra failure surface of deleting it here). */
export async function deleteSong(id: string): Promise<void> {
  const library = await loadLibrary();
  await saveLibrary(library.filter((s) => s.id !== id));
}
